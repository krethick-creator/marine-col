import type { CurrentWeather, WeatherForecast, LatLon, DataFreshnessInfo, ProviderResult, HistoricalDataPoint } from '../../types'

// --- Weather Provider Interface ---
// All weather providers implement this interface.
// Swap mock to real by changing the factory in index.ts.

export interface WeatherProvider {
  readonly isMock: boolean
  readonly dataSource: string

  getCurrentConditions(location: LatLon): Promise<ProviderResult<CurrentWeather>>;
  getForecast(location: LatLon, days: number): Promise<ProviderResult<WeatherForecast>>;
  getHistoricalData(location: LatLon, days: number): Promise<ProviderResult<HistoricalDataPoint[]>>;
  getDataFreshness(): DataFreshnessInfo
}
