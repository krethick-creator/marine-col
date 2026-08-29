import type { CurrentWeather, WeatherForecast, LatLon, DataFreshnessInfo } from '../../types'

// ─── Weather Provider Interface ───────────────────────────────────────
// All weather providers implement this interface.
// Swap mock → real by changing the factory in index.ts.

export interface WeatherProvider {
  readonly isMock: boolean
  readonly dataSource: string

  getCurrentConditions(location: LatLon): Promise<CurrentWeather>
  getForecast(location: LatLon, days: number): Promise<WeatherForecast>
  getDataFreshness(): DataFreshnessInfo
}
