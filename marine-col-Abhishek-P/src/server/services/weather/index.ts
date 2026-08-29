import { env } from '../../config/env'
import type { WeatherProvider } from './WeatherProvider'
import { MockWeatherProvider } from './MockWeatherProvider'
// Phase 6: import { OpenMeteoWeatherProvider } from './OpenMeteoWeatherProvider'

let instance: WeatherProvider | null = null

// ─── Provider Factory ─────────────────────────────────────────────────
// Returns a singleton provider. Driven entirely by env config.
// To switch from mock to real: set USE_MOCK_DATA=false in .env
// and implement OpenMeteoWeatherProvider.ts in Phase 6.

export function getWeatherProvider(): WeatherProvider {
  if (!instance) {
    if (env.useMockData) {
      instance = new MockWeatherProvider()
      console.log('[Weather] Using MockWeatherProvider (DEMO DATA)')
    } else {
      // Phase 6: instance = new OpenMeteoWeatherProvider()
      console.warn('[Weather] Real provider not yet implemented — falling back to mock')
      instance = new MockWeatherProvider()
    }
  }
  return instance
}

export type { WeatherProvider }
