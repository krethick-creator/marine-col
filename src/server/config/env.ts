// ─── Environment Configuration ────────────────────────────────────────
// All env vars are validated here. The app fails fast at startup
// if required variables are missing, rather than crashing mid-request.

import dotenv from 'dotenv'
dotenv.config()

function required(key: string): string {
  const val = process.env[key]
  if (!val) throw new Error(`Missing required environment variable: ${key}`)
  return val
}

function optional(key: string, fallback: string): string {
  return process.env[key] ?? fallback
}

export const env = {
  port:           parseInt(optional('PORT', '4000'), 10),
  nodeEnv:        optional('NODE_ENV', 'development'),
  isDev:          optional('NODE_ENV', 'development') === 'development',
  isProd:         process.env.NODE_ENV === 'production',

  // Data mode
  useMockData:    optional('USE_MOCK_DATA', 'true') === 'true',

  // JWT — required for auth
  jwtSecret:      optional('JWT_SECRET', 'orca-dev-secret-change-in-prod'),
  jwtExpiresIn:   optional('JWT_EXPIRES_IN', '7d'),

  // Database — optional until Phase 3
  databaseUrl:    optional('DATABASE_URL', ''),
  redisUrl:       optional('REDIS_URL', ''),

  // External APIs — optional until Phase 6
  incoisApiKey:   optional('INCOIS_API_KEY', ''),
  cmemsUsername:  optional('CMEMS_USERNAME', ''),
  cmemsPassword:  optional('CMEMS_PASSWORD', ''),
  openaiApiKey:   optional('OPENAI_API_KEY', ''),
  geminiApiKey:   optional('GOOGLE_GENERATIVE_AI_API_KEY', ''),
  anthropicApiKey:optional('ANTHROPIC_API_KEY', ''),
  maptilerApiKey: optional('MAPTILER_API_KEY', ''),
  bhashiniApiKey: optional('BHASHINI_API_KEY', ''),

  // CORS
  frontendUrl:    optional('FRONTEND_URL', 'http://localhost:5173'),

  // Rate limiting
  rateLimitWindowMs: parseInt(optional('RATE_LIMIT_WINDOW_MS', '60000'), 10),
  rateLimitMax:      parseInt(optional('RATE_LIMIT_MAX', '60'), 10),
} as const

// Warn if using dev-only defaults in production
if (env.isProd && env.jwtSecret === 'orca-dev-secret-change-in-prod') {
  console.error('[FATAL] JWT_SECRET must be set in production')
  process.exit(1)
}
