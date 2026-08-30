import { ChatGroq } from '@langchain/groq';
import { BaseMessage } from '@langchain/core/messages';
import { getModelFallbackChain, ROUTER_CONFIG } from './modelConfig';
import { LLMTask, ModelHealth, RouterResponse } from './llmTypes';

class GroqModelRouter {
  private healthState: Map<string, ModelHealth> = new Map();
  private fallbackChain = getModelFallbackChain();

  constructor() {
    // Initialize health state
    for (const model of this.fallbackChain) {
      this.healthState.set(model.name, {
        model: model.name,
        available: true,
        cooldownUntil: null,
        consecutiveFailures: 0,
        lastSuccess: null,
        lastFailure: null,
        totalRequests: 0,
      });
    }
  }

  private getHealthyModels(): string[] {
    const now = Date.now();
    const availableModels = [];

    for (const modelConfig of this.fallbackChain) {
      const state = this.healthState.get(modelConfig.name)!;
      
      if (state.cooldownUntil && now > state.cooldownUntil) {
        // Cooldown expired, mark as available again
        state.available = true;
        state.cooldownUntil = null;
        console.log(`[LLM] Model ${modelConfig.name} recovered from cooldown.`);
      }

      if (state.available) {
        availableModels.push(modelConfig.name);
      }
    }
    return availableModels;
  }

  private markFailure(modelName: string, isRateLimit: boolean, customCooldownMs?: number) {
    const state = this.healthState.get(modelName);
    if (!state) return;

    state.consecutiveFailures += 1;
    state.lastFailure = Date.now();

    if (isRateLimit || state.consecutiveFailures >= ROUTER_CONFIG.maxRetries) {
      state.available = false;
      const cooldown = customCooldownMs ?? ROUTER_CONFIG.cooldownMs;
      state.cooldownUntil = Date.now() + cooldown;
      console.log(`[LLM] Cooling down ${modelName} for ${cooldown / 1000}s`);
    }
  }

  private markSuccess(modelName: string) {
    const state = this.healthState.get(modelName);
    if (!state) return;
    
    state.consecutiveFailures = 0;
    state.lastSuccess = Date.now();
    state.totalRequests += 1;
  }

  public async invoke(messages: BaseMessage[], task: LLMTask = 'general'): Promise<RouterResponse> {
    const availableModels = this.getHealthyModels();
    
    if (availableModels.length === 0) {
      throw new Error("ORCA is temporarily unable to process the AI request. Please try again shortly.");
    }

    let fallbackCount = 0;

    if (!process.env.GROQ_API_KEY) {
      throw new Error("Configuration Error: GROQ_API_KEY is not set in the environment.");
    }

    for (const modelName of availableModels) {
      if (fallbackCount > 0) {
        console.log(`[LLM] Falling back to ${modelName}`);
      } else {
        console.log(`[LLM] Using model: ${modelName} for task: ${task}`);
      }

      const startTime = Date.now();

      try {
        const llm = new ChatGroq({
          apiKey: process.env.GROQ_API_KEY,
          model: modelName,
          temperature: 0, // Deterministic by default for pipelines
          maxRetries: 0,  // We handle retries/fallback manually
          timeout: ROUTER_CONFIG.requestTimeoutMs,
        });

        const response = await llm.invoke(messages);
        
        this.markSuccess(modelName);
        console.log(`[LLM] Model ${modelName} succeeded`);

        return {
          response: response.content.toString(),
          metadata: {
            modelUsed: modelName,
            fallbackUsed: fallbackCount > 0,
            fallbackCount,
            latencyMs: Date.now() - startTime,
          }
        };

      } catch (err: unknown) {
        const error = err as Record<string, unknown>;
        const errorMessage = typeof error?.message === 'string' ? error.message : String(err);
        const responseObj = error?.response as Record<string, unknown> | undefined;
        const statusCode = typeof responseObj?.status === 'number' 
          ? responseObj.status 
          : (typeof error?.status === 'number' ? error.status : null);
        
        const isTimeout = errorMessage.toLowerCase().includes('timeout') || error?.name === 'TimeoutError';
        
        if (statusCode === 401) {
          console.error(`[LLM] Model ${modelName} authentication failed (401): ${errorMessage}`);
          // 401 means the API key is invalid, so all models will fail.
          throw new Error("ORCA is temporarily unable to process the AI request. Please try again shortly.");
        } else if (statusCode === 403) {
          console.error(`[LLM] Model ${modelName} forbidden (403): ${errorMessage}`);
          this.markFailure(modelName, false);
        } else if (statusCode === 404) {
          console.error(`[LLM] Model ${modelName} not found (404) - possibly deprecated or invalid ID: ${errorMessage}`);
          this.markFailure(modelName, true, 365 * 24 * 3600 * 1000); // Mark as unavailable permanently (1 year) if not found
        } else if (statusCode === 400) {
          console.error(`[LLM] Model ${modelName} rejected request (400): ${errorMessage}`);
          this.markFailure(modelName, true); // Fallback to a different model in case of context length or strict prompt issues
        } else if (statusCode === 429 || errorMessage.toLowerCase().includes('rate limit')) {
          console.warn(`[LLM] Model ${modelName} rate limited (429): ${errorMessage}`);
          this.markFailure(modelName, true);
        } else if (statusCode && statusCode >= 500) {
          console.warn(`[LLM] Model ${modelName} provider failure (${statusCode}): ${errorMessage}`);
          this.markFailure(modelName, false);
        } else if (isTimeout) {
          console.warn(`[LLM] Model ${modelName} timed out: ${errorMessage}`);
          this.markFailure(modelName, false);
        } else {
          console.error(`[LLM] Model ${modelName} encountered unknown error (Status ${statusCode}): ${errorMessage}`);
          this.markFailure(modelName, false);
        }
        
        fallbackCount++;
        // Continue to the next model in the chain
      }
    }

    // If we exhausted all models in the fallback chain:
    throw new Error("ORCA is temporarily unable to process the AI request. Please try again shortly.");
  }
}

// Export a singleton instance
export const groqModelRouter = new GroqModelRouter();
