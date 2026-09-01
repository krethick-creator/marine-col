import { ChatGroq } from '@langchain/groq';
import { BaseMessage, HumanMessage } from '@langchain/core/messages';
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
      console.warn(`[LLM] WARNING: GROQ_API_KEY is not set in environment (.env). Fallback engine will be used.`);
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
    // Intercept if GROQ_API_KEY is not set to prevent graph execution failure
    if (!process.env.GROQ_API_KEY) {
      console.log(`[LLM] GROQ_API_KEY missing - running local fallback parser for task: ${task}`);
      if (task === 'planning') {
        const lastMessage = messages[messages.length - 1]?.content || '';
        const q = String(lastMessage).toLowerCase();
        let intent = 'general';
        if (q.includes('puducherry') || q.includes('nagapattinam') || q.includes('kakinada') || q.includes('trip') || q.includes('travel') || q.includes('from') || q.includes('plan')) {
          intent = 'trip_planning';
        } else if (q.includes('satellite') || q.includes('imagery') || q.includes('chlorophyll') || q.includes('sst') || q.includes('pfz') || q.includes('fish')) {
          intent = 'fishing';
        } else if (q.includes('alert') || q.includes('warning') || q.includes('advisory')) {
          intent = 'safety';
        } else if (q.includes('weather') || q.includes('wave') || q.includes('wind') || q.includes('sea') || q.includes('condition')) {
          intent = 'weather';
        }
        return {
          response: intent,
          metadata: { modelUsed: 'mock-planner', fallbackUsed: false, fallbackCount: 0, latencyMs: 1 }
        };
      }

      if (task === 'synthesis') {
        const prompt = messages.map(m => m.content).join('\n');
        
        let riskAssessment: any = null;
        let contextData: any = null;
        
        try {
          const riskMatch = prompt.match(/Risk Assessment\s*\(DETERMINISTIC\s*-\s*DO\s*NOT\s*OVERRIDE\s*THIS\s*LEVEL\):\s*(\{[\s\S]*?\})/);
          if (riskMatch) riskAssessment = JSON.parse(riskMatch[1]);
        } catch {}

        try {
          const contextMatch = prompt.match(/Context Data:\s*(\{[\s\S]*?\})/);
          if (contextMatch) contextData = JSON.parse(contextMatch[1]);
        } catch {}

        const locName = contextData?.location?.name || 'Chennai';
        const lat = contextData?.location?.lat;
        const lon = contextData?.location?.lon;

        let md = `## 🌊 ORCA Marine Report for **${locName}** (${lat?.toFixed(4)}, ${lon?.toFixed(4)})\n\n`;

        if (riskAssessment) {
          const statusLabel = riskAssessment.status === 'NO_GO' ? '🚫 NO-GO' : riskAssessment.status === 'CAUTION' ? '⚠️ CAUTION' : '✅ GO';
          md += `### 🚦 Safety Assessment: **${statusLabel}**\n`;
          if (riskAssessment.reasoning?.length > 0) {
            md += `**Key Advisories:**\n`;
            riskAssessment.reasoning.forEach((r: string) => {
              md += `- ${r}\n`;
            });
          }
          md += `\n`;
        }

        // Weather
        if (contextData?.weather) {
          const w = contextData.weather;
          md += `### 🌤 Weather Forecast\n`;
          md += `- **Temperature:** ${w.temperature}°C (Feels like ${w.feelsLike}°C)\n`;
          md += `- **Wind speed:** ${w.windSpeed} km/h from ${w.windDirection}\n`;
          md += `- **Condition:** ${w.condition}\n\n`;
        }

        // Ocean
        if (contextData?.ocean) {
          const o = contextData.ocean;
          md += `### ⛵ Ocean Conditions\n`;
          if (o.waveHeight !== null) md += `- **Wave Height:** ${o.waveHeight} m\n`;
          if (o.swellPeriod !== null) md += `- **Swell Period:** ${o.swellPeriod} s\n`;
          if (o.currentSpeed !== null) md += `- **Current Speed:** ${o.currentSpeed} km/h\n\n`;
        }

        // Alerts
        if (contextData?.alerts && contextData.alerts.length > 0) {
          md += `### 🚨 Active Alerts\n`;
          contextData.alerts.forEach((a: any) => {
            md += `- **[${a.severity}] ${a.title}**: ${a.description} (${a.source})\n`;
          });
          md += `\n`;
        } else if (contextData?.alerts) {
          md += `### 🚨 Active Alerts\n- **No Active Alerts**\n\n`;
        }

        // Satellite
        if (contextData?.satellite) {
          const sat = contextData.satellite;
          md += `### 🛰 Remote Sensing / Satellite Observation\n`;
          md += `- **Data source:** ${sat.dataSource || 'Satellite Remote Sensing Data'}\n`;
          if (sat.pfzZones?.length > 0) {
            md += `- **Potential Fishing Zones (PFZ):** Detected ${sat.pfzZones.length} high-potential fishing coordinates.\n`;
          } else {
            md += `- **PFZ Status:** No active Potential Fishing Zones identified in the direct vicinity.\n`;
          }
          md += `\n`;
        }

        md += `*Report generated via ORCA Rule-based Fallback Engine (GROQ_API_KEY missing).*`;

        return {
          response: md,
          metadata: { modelUsed: 'mock-synthesis', fallbackUsed: false, fallbackCount: 0, latencyMs: 1 }
        };
      }

      // Default fallback string
      return {
        response: "ORCA Local Fallback: Please set GROQ_API_KEY in the environment for full semantic dialogue capability.",
        metadata: { modelUsed: 'mock-general', fallbackUsed: false, fallbackCount: 0, latencyMs: 1 }
      };
    }

    const availableModels = this.getHealthyModels();
    
    if (availableModels.length === 0) {
      throw new Error("ORCA is temporarily unable to process the AI request. All configured models are currently in cooldown. Please try again shortly.");
    }

    let fallbackCount = 0;

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
          temperature: 0,
          maxRetries: 0,
          timeout: ROUTER_CONFIG.requestTimeoutMs,
        });

        const hasHumanMessage = messages.some((m) => m._getType() === 'human');
        const formattedMessages = hasHumanMessage
          ? messages
          : [...messages, new HumanMessage('Proceed with analysis based on system prompt.')];

        const response = await llm.invoke(formattedMessages);
        
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
          this.markFailure(modelName, true);
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
      }
    }

    throw new Error("ORCA is temporarily unable to process the AI request. Please try again shortly.");
  }
}

export const groqModelRouter = new GroqModelRouter();
