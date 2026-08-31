import type { WeatherProvider } from './WeatherProvider'
import type { CurrentWeather, WeatherForecast, LatLon, DataFreshnessInfo, StatusLevel, ProviderResult, HistoricalDataPoint } from '../../types'

// --- Mock Weather Provider ---
// Returns clearly-labelled DEMO data.
// isMock is always true -- never hidden, never pretended to be real.

export class MockWeatherProvider implements WeatherProvider {
  readonly isMock = true
  readonly dataSource = '[DEMO] Mock Weather Provider'

  async getCurrentConditions(location: LatLon): Promise<ProviderResult<CurrentWeather>> {
    const data: CurrentWeather = {
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
      location: location.lat.toFixed(4) + 'N ' + location.lon.toFixed(4) + 'E',
      isMockData: true,
      timestamp: new Date(),
      pressure: 1011.2,
      windGusts: 24.5,
      cloudCover: 45,
      sunrise: '06:05 AM',
      sunset: '06:22 PM',
    }
    return { data, status: 'MOCK_DATA' }
  }

  async getForecast(location: LatLon, days: number): Promise<ProviderResult<WeatherForecast>> {
    const currentResult = await this.getCurrentConditions(location)
    const current = currentResult.data as CurrentWeather

    const hourly = Array.from({ length: Math.min(days * 24, 72) }, (_, i) => {
      const time = new Date(Date.now() + i * 3600000)
      const hour = time.getHours()
      const dayOffset = Math.floor(i / 24)
      const isBadDay = dayOffset === 2
      const isAfternoon = dayOffset === 1 && hour >= 11
      return {
        time,
        temperature: 28 - dayOffset,
        windSpeed: isBadDay ? 38 : isAfternoon ? 26 : 18,
        waveHeight: isBadDay ? 2.9 : isAfternoon ? 1.8 : 1.2,
        precipitation: isBadDay ? 85 : isAfternoon ? 30 : 15,
        condition: isBadDay ? 'Heavy Rain' : isAfternoon ? 'Cloudy' : 'Partly Cloudy',
      }
    })

    const dailyStatuses: StatusLevel[] = ['GO', 'CAUTION', 'NO_GO']
    const daily = Array.from({ length: Math.min(days, 7) }, (_, i) => ({
      date: new Date(Date.now() + i * 86400000),
      high: 32 - i,
      low: 26 - i,
      windSpeedMax: [18, 26, 38][i] ?? 20,
      waveHeightMax: [1.2, 1.8, 2.9][i] ?? 1.5,
      condition: ['Partly Cloudy', 'Cloudy', 'Heavy Rain'][i] ?? 'Partly Cloudy',
      status: dailyStatuses[i] ?? 'CAUTION',
      safeWindow: i === 1 ? { start: '06:00', end: '11:30' } : undefined,
    }))

    const data: WeatherForecast = {
      current,
      hourly,
      daily,
      isMockData: true,
      dataSource: this.dataSource,
      fetchedAt: new Date(),
    }
    return { data, status: 'MOCK_DATA' }
  }

  async getHistoricalData(location: LatLon, days: number): Promise<ProviderResult<HistoricalDataPoint[]>> {
    const pointsCount = days * 24;
    const data: HistoricalDataPoint[] = Array.from({ length: pointsCount }, (_, i) => {
      const time = new Date(Date.now() - (pointsCount - i) * 3600000);
      const hour = time.getHours();
      const tempBase = 27 + Math.sin((i / 24) * Math.PI * 2) * 2;
      const tempDaily = Math.sin((hour / 24) * Math.PI * 2 - Math.PI / 2) * 2;
      const temperature = parseFloat((tempBase + tempDaily).toFixed(1));
      
      const windSpeed = parseFloat((12 + Math.cos((i / 12) * Math.PI) * 4 + (i % 24 === 15 ? 10 : 0)).toFixed(1));
      const waveHeight = parseFloat((0.8 + Math.sin((i / 48) * Math.PI) * 0.4 + (windSpeed > 20 ? 0.8 : 0)).toFixed(2));
      const precipitation = i % 48 === 0 ? parseFloat((Math.random() * 5).toFixed(1)) : 0;
      const sst = parseFloat((29.5 + Math.sin((i / 240) * Math.PI) * 0.5).toFixed(2));
      const chlorophyll = i % 5 === 0 ? null : parseFloat((0.3 + Math.cos((i / 120) * Math.PI) * 0.1 + Math.random() * 0.05).toFixed(3));

      return {
        time: time.toISOString(),
        temperature,
        windSpeed,
        waveHeight,
        precipitation,
        sst,
        chlorophyll,
      };
    });

    return { data, status: 'MOCK_DATA' };
  }

  getDataFreshness(): DataFreshnessInfo {
    return {
      weather: 'Updated 2 hours ago (DEMO)',
      marine: 'Valid 05:00-17:00 IST (DEMO)',
      satellite: 'Issued today at 06:00 IST (DEMO)',
      updatedAt: new Date(Date.now() - 2 * 3600000),
      confidence: 'MEDIUM',
    }
  }
}
