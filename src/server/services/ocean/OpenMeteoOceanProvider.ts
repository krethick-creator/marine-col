import type { OceanProvider } from './OceanProvider';
import type { OceanSnapshot, FishingZone, LatLon, ProviderResult } from '../../types';
import { redis } from '../../cache';

function degreesToCompass(deg: number | null | undefined): string | null {
  if (deg === null || deg === undefined) return null;
  const val = Math.floor((deg / 22.5) + 0.5);
  const arr = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  return arr[(val % 16)];
}

function calculateSeaState(waveHeight: number | null): string | null {
  if (waveHeight === null || waveHeight === undefined) return null;
  if (waveHeight < 0.5) return 'Calm';
  if (waveHeight < 1.25) return 'Slight';
  if (waveHeight < 2.5) return 'Moderate';
  if (waveHeight < 4) return 'Rough';
  if (waveHeight < 6) return 'Very Rough';
  return 'High';
}

export class OpenMeteoOceanProvider implements OceanProvider {
  public readonly isMock = false;
  public readonly dataSource = 'Open-Meteo Marine API';

  private async fetchWithCache(url: string, cacheKey: string, ttlSeconds: number = 3600): Promise<any> {
    try {
      if (redis.status === 'ready') {
        const cached = await redis.get(cacheKey);
        if (cached) {
          return JSON.parse(cached);
        }
      }
    } catch (err) {
      console.warn('[Ocean] Redis cache error:', err);
    }

    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Open-Meteo Marine API Error: ${res.status} ${res.statusText}`);
    }

    const data = await res.json();

    try {
      if (redis.status === 'ready') {
        await redis.set(cacheKey, JSON.stringify(data), 'EX', ttlSeconds);
      }
    } catch (err) {
      console.warn('[Ocean] Redis cache set error:', err);
    }

    return data;
  }

  public async getSnapshot(location: LatLon): Promise<ProviderResult<OceanSnapshot>> {
    try {
      const lat = location.lat;
      const lon = location.lon;
      const url = `https://marine-api.open-meteo.com/v1/marine?latitude=${lat}&longitude=${lon}&current=wave_height,wave_period,wave_direction,swell_wave_height,swell_wave_period,swell_wave_direction,ocean_current_velocity,ocean_current_direction`;
      const cacheKey = `ocean:mar:${lat.toFixed(2)}:${lon.toFixed(2)}`;

      console.log(`[Ocean] Using Open-Meteo Marine Provider (REAL DATA)`);
      console.log(`[Ocean] Coordinates: ${lat.toFixed(4)}, ${lon.toFixed(4)}`);

      const data = await this.fetchWithCache(url, cacheKey);
      const c = data?.current || {};

      const waveHeight = typeof c.wave_height === 'number' ? c.wave_height : null;
      const swellPeriod = typeof c.swell_wave_period === 'number' ? c.swell_wave_period : (typeof c.wave_period === 'number' ? c.wave_period : null);
      const waveDirection = typeof c.wave_direction === 'number' ? c.wave_direction : null;
      const swellDirection = degreesToCompass(c.swell_wave_direction ?? c.wave_direction);
      const currentSpeed = typeof c.ocean_current_velocity === 'number' ? c.ocean_current_velocity : null;
      const currentDirection = degreesToCompass(c.ocean_current_direction);
      const seaState = calculateSeaState(waveHeight);

      console.log(`[Ocean] Wave height: ${waveHeight !== null ? `${waveHeight} m` : 'null'}`);
      console.log(`[Ocean] Swell period: ${swellPeriod !== null ? `${swellPeriod} s` : 'null'}`);
      console.log(`[Ocean] Wave direction: ${waveDirection !== null ? `${waveDirection}Â°` : 'null'}`);
      console.log(`[Ocean] Marine data retrieved successfully`);

      const snapshot: OceanSnapshot = {
        sst: null,
        chlorophyll: null,
        waveHeight,
        swellPeriod,
        waveDirection,
        swellDirection,
        currentSpeed,
        currentDirection,
        seaState,
        units: {
          waveHeight: 'm',
          swellPeriod: 's',
          waveDirection: 'Â°',
          currentSpeed: 'km/h',
          currentDirection: 'Â°'
        },
        isMockData: false,
        dataSource: this.dataSource,
        timestamp: new Date()
      };

      return { data: snapshot, status: 'REAL_DATA_SUCCESS' };
    } catch (error) {
      console.warn('[Ocean] Open-Meteo Ocean provider failed:', error);
      // Return provider unavailable with no data
      return { status: 'PROVIDER_UNAVAILABLE', error: 'Ocean provider unavailable' };
    }
  }

  public async getPFZZones(_location: LatLon, _radiusKm = 100): Promise<FishingZone[]> {
    return [];
  }
}
