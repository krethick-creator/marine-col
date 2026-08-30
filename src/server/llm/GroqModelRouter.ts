import { ChatGroq } from '@langchain/groq';
import { BaseMessage } from '@langchain/core/messages';
import { getModelFallbackChain, ROUTER_CONFIG } from './modelConfig';
import { LLMTask, ModelHealth, RouterResponse } from './llmTypes';

class GroqModelRouter {
  private healthState: Map<string, ModelHealth> = new Map();
  private fallbackChain = getModelFallbackChain();

  constructor() {
    this.initHealthState();
  }

  public initHealthState() {
    this.fallbackChain = getModelFallbackChain();
    for (const model of this.fallbackChain) {
      if (!this.healthState.has(model.name)) {
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
  }

  public printStatus() {
    const chainStr = this.fallbackChain.map((m, i) => `#${i + 1} ${m.name}`).join(' -> ');
    console.log(`[LLM] Groq Model Router chain configured: ${chainStr}`);
    if (!process.env.GROQ_API_KEY) {
      console.warn(`[LLM] WARNING: GROQ_API_KEY is not set in environment (.env).`);
    } else {
      console.log(`[LLM] GROQ_API_KEY detected in environment.`);
    }
  }

  private getHealthyModels(): string[] {
    const now = Date.now();
    const availableModels: string[] = [];

    // Ensure fallback chain is populated
    if (this.fallbackChain.length === 0) {
      this.initHealthState();
    }

    for (const modelConfig of this.fallbackChain) {
      let state = this.healthState.get(modelConfig.name);
      if (!state) {
        state = {
          model: modelConfig.name,
          available: true,
          cooldownUntil: null,
          consecutiveFailures: 0,
          lastSuccess: null,
          lastFailure: null,
          totalRequests: 0,
        };
        this.healthState.set(modelConfig.name, state);
      }

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

  private markFailure(modelName: string, isRateLimitOrUnavailable: boolean, customCooldownMs?: number) {
    const state = this.healthState.get(modelName);
    if (!state) return;

    state.consecutiveFailures += 1;
    state.lastFailure = Date.now();

    if (isRateLimitOrUnavailable || state.consecutiveFailures >= ROUTER_CONFIG.maxRetries) {
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
      throw new Error("ORCA is temporarily unable to process the AI request. All configured models are currently in cooldown. Please try again shortly.");
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
        const isNotFound = statusCode === 404 || errorMessage.toLowerCase().includes('not found') || errorMessage.toLowerCase().includes('model_not_found') || errorMessage.toLowerCase().includes('does not exist');
        const isDecommissioned = (statusCode === 400 && (errorMessage.toLowerCase().includes('decommissioned') || errorMessage.toLowerCase().includes('no longer supported'))) || errorMessage.toLowerCase().includes('model_decommissioned');

        if (statusCode === 401) {
          console.error(`[LLM] Model ${modelName} authentication failed (401): ${errorMessage}`);
          throw new Error("ORCA is temporarily unable to process the AI request. Please check that GROQ_API_KEY in .env is valid.");
        } else if (statusCode === 403) {
          console.error(`[LLM] Model ${modelName} forbidden (403): ${errorMessage}`);
          this.markFailure(modelName, false);
        } else if (isNotFound) {
          console.error(`[LLM] Model ${modelName} not found (404) - model is unavailable: ${errorMessage}`);
          this.markFailure(modelName, true); // standard cooldown, NOT 1 year
        } else if (isDecommissioned) {
          console.error(`[LLM] Model ${modelName} decommissioned (400) - model is unavailable: ${errorMessage}`);
          this.markFailure(modelName, true);
        } else if (statusCode === 400) {
          console.error(`[LLM] Model ${modelName} rejected request (400): ${errorMessage}`);
          this.markFailure(modelName, true);
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
          console.error(`[LLM] Model ${modelName} encountered error (Status ${statusCode}): ${errorMessage}`);
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
