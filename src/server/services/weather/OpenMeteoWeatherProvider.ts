import { WeatherProvider } from './WeatherProvider';
import { CurrentWeather, WeatherForecast, LatLon, DataFreshnessInfo, HourlyWeather, DailyWeather } from '../../types';
import { redis } from '../../cache';

// Mapping Open-Meteo weather codes to our simple string conditions
function mapWeatherCode(code: number): string {
  if (code === 0) return 'Clear';
  if (code === 1 || code === 2 || code === 3) return 'Cloudy';
  if (code >= 45 && code <= 48) return 'Fog';
  if (code >= 51 && code <= 67) return 'Rain';
  if (code >= 71 && code <= 82) return 'Snow';
  if (code >= 95 && code <= 99) return 'Thunderstorm';
  return 'Unknown';
}

function calculateSeaState(waveHeight: number): string {
  if (waveHeight < 0.5) return 'Calm';
  if (waveHeight < 1.25) return 'Slight';
  if (waveHeight < 2.5) return 'Moderate';
  if (waveHeight < 4) return 'Rough';
  if (waveHeight < 6) return 'Very Rough';
  return 'High';
}

function degreesToCompass(deg: number): string {
  const val = Math.floor((deg / 22.5) + 0.5);
  const arr = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  return arr[(val % 16)];
}

export class OpenMeteoWeatherProvider implements WeatherProvider {
  public readonly isMock = false;
  public readonly dataSource = 'Open-Meteo';

  private async fetchWithCache(url: string, cacheKey: string, ttlSeconds: number = 3600): Promise<any> {
    try {
      if (redis.status === 'ready') {
        const cached = await redis.get(cacheKey);
        if (cached) {
          return JSON.parse(cached);
        }
      }
    } catch (err) {
      console.warn('[Weather] Redis cache error:', err);
    }

    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Open-Meteo API Error: ${res.status} ${res.statusText}`);
    }

    const data = await res.json();

    try {
      if (redis.status === 'ready') {
        await redis.set(cacheKey, JSON.stringify(data), 'EX', ttlSeconds);
      }
    } catch (err) {
      console.warn('[Weather] Redis cache set error:', err);
    }

    return data;
  }

  private async getCombinedData(lat: number, lon: number, days: number = 3) {
    // We fetch from both standard weather and marine APIs concurrently
    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,wind_direction_10m&hourly=temperature_2m,precipitation_probability,precipitation,weather_code,visibility,wind_speed_10m,wind_direction_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max&timezone=auto&forecast_days=${days}`;
    
    const marineUrl = `https://marine-api.open-meteo.com/v1/marine?latitude=${lat}&longitude=${lon}&current=wave_height,wave_period&hourly=wave_height,wave_period&daily=wave_height_max&timezone=auto`;

    const weatherKey = `weather:std:${lat.toFixed(2)}:${lon.toFixed(2)}:${days}`;
    const marineKey = `weather:mar:${lat.toFixed(2)}:${lon.toFixed(2)}:${days}`;

    const [weatherData, marineData] = await Promise.all([
      this.fetchWithCache(weatherUrl, weatherKey),
      this.fetchWithCache(marineUrl, marineKey).catch((e) => {
        console.warn('[Weather] Marine API failed (could be inland). Defaulting to UNKNOWN.', e);
        return null;
      })
    ]);

    return { weatherData, marineData };
  }

  public async getCurrentConditions(location: LatLon): Promise<CurrentWeather> {
    const { weatherData, marineData } = await this.getCombinedData(location.lat, location.lon, 1);

    const c = weatherData.current;
    const m = marineData?.current || { wave_height: null, wave_period: null };
    
    // Attempt to parse lightning risk from weather code
    const isThunderstorm = c.weather_code >= 95 && c.weather_code <= 99;

    return {
      temperature: c.temperature_2m,
      feelsLike: c.apparent_temperature,
      condition: mapWeatherCode(c.weather_code),
      windSpeed: c.wind_speed_10m,
      windDirection: degreesToCompass(c.wind_direction_10m),
      humidity: c.relative_humidity_2m,
      visibility: weatherData.hourly?.visibility?.[0] || 10000,
      waveHeight: m.wave_height,
      swellPeriod: m.wave_period,
      seaState: m.wave_height === null ? 'UNKNOWN' : calculateSeaState(m.wave_height),
      rainProbability: weatherData.hourly?.precipitation_probability?.[0] || 0,
      lightningRisk: isThunderstorm,
      location: `${location.lat.toFixed(2)}, ${location.lon.toFixed(2)}`,
      isMockData: false,
      timestamp: new Date()
    };
  }

  public async getForecast(location: LatLon, days: number): Promise<WeatherForecast> {
    const { weatherData, marineData } = await this.getCombinedData(location.lat, location.lon, days);

    const current = await this.getCurrentConditions(location);

    const hourly: HourlyWeather[] = [];
    if (weatherData.hourly && weatherData.hourly.time) {
      for (let i = 0; i < weatherData.hourly.time.length; i++) {
        hourly.push({
          time: new Date(weatherData.hourly.time[i]),
          temperature: weatherData.hourly.temperature_2m[i],
          windSpeed: weatherData.hourly.wind_speed_10m[i],
          waveHeight: marineData?.hourly?.wave_height?.[i] ?? null,
          precipitation: weatherData.hourly.precipitation[i],
          condition: mapWeatherCode(weatherData.hourly.weather_code[i])
        });
      }
    }

    const daily: DailyWeather[] = [];
    if (weatherData.daily && weatherData.daily.time) {
      for (let i = 0; i < weatherData.daily.time.length; i++) {
        daily.push({
          date: new Date(weatherData.daily.time[i]),
          high: weatherData.daily.temperature_2m_max[i],
          low: weatherData.daily.temperature_2m_min[i],
          windSpeedMax: weatherData.daily.wind_speed_10m_max[i],
          waveHeightMax: marineData?.daily?.wave_height_max?.[i] ?? null,
          condition: mapWeatherCode(weatherData.daily.weather_code[i]),
          status: 'GO' // Status is calculated by Risk Engine later
        });
      }
    }

    return {
      current,
      hourly,
      daily,
      isMockData: false,
      dataSource: this.dataSource,
      fetchedAt: new Date()
    };
  }

  public getDataFreshness(): DataFreshnessInfo {
    return {
      weather: 'Updated within last hour',
      marine: 'Updated within last hour',
      satellite: 'N/A',
      updatedAt: new Date(),
      confidence: 'HIGH'
    };
  }
}
