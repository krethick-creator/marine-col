import { ModelConfig } from './llmTypes';
import dotenv from 'dotenv';
dotenv.config();

export const getModelFallbackChain = (): ModelConfig[] => {
  const chain: ModelConfig[] = [];
  
  const primary = process.env.GROQ_MODEL_PRIMARY || 'llama3-70b-8192';
  chain.push({ name: primary, priority: 1 });

  const fallback1 = process.env.GROQ_MODEL_FALLBACK_1 || 'llama3-8b-8192';
  if (fallback1) chain.push({ name: fallback1, priority: 2 });

  const fallback2 = process.env.GROQ_MODEL_FALLBACK_2 || 'mixtral-8x7b-32768';
  if (fallback2) chain.push({ name: fallback2, priority: 3 });

  const fallback3 = process.env.GROQ_MODEL_FALLBACK_3 || 'gemma-7b-it';
  if (fallback3) chain.push({ name: fallback3, priority: 4 });

  // Filter out any duplicates just in case
  const uniqueNames = new Set<string>();
  const filteredChain = chain.filter((m) => {
    if (uniqueNames.has(m.name)) return false;
    uniqueNames.add(m.name);
    return true;
  });

  return filteredChain;
};

export const ROUTER_CONFIG = {
  maxRetries: parseInt(process.env.GROQ_MAX_RETRIES || '1', 10),
  requestTimeoutMs: parseInt(process.env.GROQ_REQUEST_TIMEOUT_MS || '30000', 10),
  cooldownMs: parseInt(process.env.GROQ_COOLDOWN_MS || '60000', 10),
};
