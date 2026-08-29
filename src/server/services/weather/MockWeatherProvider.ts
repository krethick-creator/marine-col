import type { WeatherProvider } from './WeatherProvider'
import type { CurrentWeather, WeatherForecast, LatLon, DataFreshnessInfo, StatusLevel } from '../../types'

// ─── Mock Weather Provider ────────────────────────────────────────────
// Returns clearly-labelled DEMO data.
// isMock is always true — never hidden, never pretended to be real.

export class MockWeatherProvider implements WeatherProvider {
  readonly isMock = true
  readonly dataSource = '[DEMO] Mock Weather Provider'

  async getCurrentConditions(location: LatLon): Promise<CurrentWeather> {
    return {
      temperature: 28,
      feelsLike: 31,
      condition: 'Partly Cloudy',
      windSpeed: 18,
      windDirection: 'SW',
      humidity: 74,
      visibility: 12,
      waveHeight: 1.2,
      swellPeriod: 8,
      seaState: 'Slight',
      rainProbability: 20,
      lightningRisk: false,
      location: `${location.lat.toFixed(4)}°N ${location.lon.toFixed(4)}°E`,
      isMockData: true,
      timestamp: new Date(),
    }
  }

  async getForecast(location: LatLon, days: number): Promise<WeatherForecast> {
    const current = await this.getCurrentConditions(location)

    // Simulate a deteriorating-afternoon pattern (classic CAUTION scenario)
    const hourly = Array.from({ length: Math.min(days * 24, 72) }, (_, i) => {
      const time = new Date(Date.now() + i * 3600_000)
      const hour = time.getHours()
      const dayOffset = Math.floor(i / 24)

      // Day 3 is bad weather
      const isBadDay = dayOffset === 2
      // Afternoon deterioration on day 2
      const isAfternoonDeterioration = dayOffset === 1 && hour >= 11

      return {
        time,
        temperature: 28 - dayOffset,
        windSpeed: isBadDay ? 38 : isAfternoonDeterioration ? 26 : 18,
        waveHeight: isBadDay ? 2.9 : isAfternoonDeterioration ? 1.8 : 1.2,
        precipitation: isBadDay ? 85 : isAfternoonDeterioration ? 30 : 15,
        condition: isBadDay ? 'Heavy Rain' : isAfternoonDeterioration ? 'Cloudy' : 'Partly Cloudy',
      }
    })

    const dailyStatuses: StatusLevel[] = ['GO', 'CAUTION', 'NO_GO']
    const daily = Array.from({ length: Math.min(days, 7) }, (_, i) => ({
      date: new Date(Date.now() + i * 86_400_000),
      high: 32 - i,
      low: 26 - i,
      windSpeedMax: [18, 26, 38][i] ?? 20,
      waveHeightMax: [1.2, 1.8, 2.9][i] ?? 1.5,
      condition: ['Partly Cloudy', 'Cloudy', 'Heavy Rain'][i] ?? 'Partly Cloudy',
      status: dailyStatuses[i] ?? 'CAUTION',
      safeWindow: i === 1 ? { start: '06:00', end: '11:30' } : undefined,
    }))

    return {
      current,
      hourly,
      daily,
      isMockData: true,
      dataSource: this.dataSource,
      fetchedAt: new Date(),
    }
  }

  getDataFreshness(): DataFreshnessInfo {
    return {
      weather: 'Updated 2 hours ago (DEMO)',
      marine: 'Valid 05:00–17:00 IST (DEMO)',
      satellite: 'Issued today at 06:00 IST (DEMO)',
      updatedAt: new Date(Date.now() - 2 * 3600_000),
      confidence: 'MEDIUM',
    }
  }
}
