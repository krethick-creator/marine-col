import { env } from '../../config/env'
import type { WeatherProvider } from './WeatherProvider'
import { MockWeatherProvider } from './MockWeatherProvider'
import { OpenMeteoWeatherProvider } from './OpenMeteoWeatherProvider'

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
      instance = new OpenMeteoWeatherProvider()
      console.log('[Weather] Using OpenMeteoWeatherProvider (REAL DATA)')
    }
  }
  return instance
}

export type { WeatherProvider }
