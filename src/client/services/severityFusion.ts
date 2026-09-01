/**
 * severityFusion.ts
 *
 * STANDALONE FILE — does not import anything from your existing agents,
 * routes, or services. It only exports one function. Nothing in your
 * current code is touched by adding this file.
 *
 * PURPOSE: Instead of your 5 agents (weather, ocean, satellite,
 * geospatial, alert) each deciding "should I alert?" on their own,
 * this combines their signals into ONE combined risk score. This is
 * what makes it look like your agents are actually working together,
 * not just running as 5 separate scripts.
 *
 * HOW TO USE (see bottom of file for a worked example):
 *   import { fuseSeverity } from './severityFusion';
 *   const result = fuseSeverity({ weather: 80, ocean: 60, satellite: 40, geospatial: 20 });
 *   console.log(result.score, result.level, result.shouldAlert);
 */

// Each agent reports a 0-100 "risk" number for its own domain.
// If you don't have a 0-100 number yet, start simple: 0 = normal, 50 = warning, 100 = severe.
export interface AgentSignals {
  weather?: number;     // 0-100, from your weather agent
  ocean?: number;       // 0-100, from your ocean agent
  satellite?: number;   // 0-100, from your satellite agent
  geospatial?: number;  // 0-100, from your geospatial agent
}

export interface FusionResult {
  score: number;                 // combined 0-100 score
  level: 'low' | 'moderate' | 'high' | 'severe';
  shouldAlert: boolean;          // true if this is worth sending an SMS for
  contributingAgents: string[];  // which agents pushed the score up
}

// Adjust these weights based on which signals you trust most.
// They must add up to 1 (or close to it).
const WEIGHTS = {
  weather: 0.30,
  ocean: 0.30,
  satellite: 0.20,
  geospatial: 0.20,
};

// Score thresholds — tweak these after testing with your real data.
const THRESHOLDS = {
  moderate: 30,
  high: 55,
  severe: 75,
};

/**
 * Combines individual agent risk scores into one fused severity score.
 * Missing signals are simply skipped (weights are re-normalized).
 */
export function fuseSeverity(signals: AgentSignals): FusionResult {
  const entries = Object.entries(signals).filter(
    ([, value]) => typeof value === 'number' && !Number.isNaN(value)
  ) as [keyof AgentSignals, number][];

  if (entries.length === 0) {
    return { score: 0, level: 'low', shouldAlert: false, contributingAgents: [] };
  }

  // Re-normalize weights across only the agents that actually reported a value
  const totalWeight = entries.reduce((sum, [key]) => sum + WEIGHTS[key], 0);

  let score = 0;
  const contributingAgents: string[] = [];

  for (const [key, value] of entries) {
    const normalizedWeight = WEIGHTS[key] / totalWeight;
    score += value * normalizedWeight;
    if (value >= THRESHOLDS.moderate) {
      contributingAgents.push(key);
    }
  }

  score = Math.round(score);

  let level: FusionResult['level'] = 'low';
  if (score >= THRESHOLDS.severe) level = 'severe';
  else if (score >= THRESHOLDS.high) level = 'high';
  else if (score >= THRESHOLDS.moderate) level = 'moderate';

  return {
    score,
    level,
    shouldAlert: score >= THRESHOLDS.moderate,
    contributingAgents,
  };
}

// ---- Worked example (safe to delete, just for reference) ----
// const result = fuseSeverity({ weather: 80, ocean: 65, satellite: 30, geospatial: 20 });
// result => { score: 56, level: 'high', shouldAlert: true, contributingAgents: ['weather','ocean'] }
