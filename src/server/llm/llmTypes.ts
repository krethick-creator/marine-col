import { BaseMessage } from '@langchain/core/messages';

export type LLMTask =
  | 'planning'
  | 'classification'
  | 'extraction'
  | 'synthesis'
  | 'general';

export interface ModelConfig {
  name: string;
  priority: number;
}

export interface ModelHealth {
  model: string;
  available: boolean;
  cooldownUntil: number | null;
  consecutiveFailures: number;
  lastSuccess: number | null;
  lastFailure: number | null;
  totalRequests: number;
}

export interface RouterResponse {
  response: string;
  metadata: {
    modelUsed: string;
    fallbackUsed: boolean;
    fallbackCount: number;
    latencyMs: number;
  };
}
