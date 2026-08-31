import type { AdvisoryProvider } from './AdvisoryProvider'
import type { Alert, Advisory, LatLon } from '../../types'

export class RealAdvisoryProvider implements AdvisoryProvider {
  readonly isMock = false
  readonly dataSource = 'Open-Meteo Weather & Marine Forecast APIs'

  private async fetchLiveConditions(lat: number, lon: number) {
    const marineUrl = `https://marine-api.open-meteo.com/v1/marine?latitude=${lat}&longitude=${lon}&current=wave_height,wave_period,swell_wave_height,wind_wave_height,wave_direction&timezone=auto`
    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=wind_speed_10m,wind_gusts_10m,wind_direction_10m&timezone=auto`

    const [marineRes, weatherRes] = await Promise.all([
      fetch(marineUrl).catch(() => null),
      fetch(weatherUrl).catch(() => null)
    ])

    if (!marineRes?.ok || !weatherRes?.ok) {
      console.warn(`[RealAdvisoryProvider] Open-Meteo APIs degraded. Marine: ${marineRes?.status || 'network error'}, Weather: ${weatherRes?.status || 'network error'}`);
      return null;
    }

    try {
      const marine = (await marineRes.json()) as any;
      const weather = (await weatherRes.json()) as any;
      const m = marine?.current || {};
      const w = weather?.current || {};
      return {
        observedAt: m.time || w.time || new Date().toISOString(),
        waveHeight: typeof m.wave_height === 'number' ? m.wave_height : null,
        wavePeriod: typeof m.wave_period === 'number' ? m.wave_period : null,
        waveDirection: typeof m.wave_direction === 'number' ? m.wave_direction : null,
        swellWaveHeight: typeof m.swell_wave_height === 'number' ? m.swell_wave_height : null,
        windWaveHeight: typeof m.wind_wave_height === 'number' ? m.wind_wave_height : null,
        windSpeed: typeof w.wind_speed_10m === 'number' ? w.wind_speed_10m : null,
        windGust: typeof w.wind_gusts_10m === 'number' ? w.wind_gusts_10m : null,
        windDirection: typeof w.wind_direction_10m === 'number' ? w.wind_direction_10m : null,
      }
    } catch (e) {
      console.error('[RealAdvisoryProvider] Error parsing JSON:', e);
      return null;
    }
  }

  async getActiveAlerts(location: LatLon, _radiusKm = 200): Promise<Alert[]> {
    console.log(`[Alert Agent] Started`);
    console.log(`[Alert Agent] Location: lat=${location.lat.toFixed(4)}, lon=${location.lon.toFixed(4)}`);
    console.log(`[Alert Agent] Fetching real alerts`);

    const cond = await this.fetchLiveConditions(location.lat, location.lon);
    if (!cond) {
      console.log(`[Alert Agent] Real alerts retrieved: 0 (API error fallback)`);
      console.log(`[Alert Agent] Completed`);
      return [];
    }

    const alerts: Alert[] = [];
    const WAVE = { caution: 1.25, danger: 2.0 };
    const WIND = { low: 22, caution: 28, danger: 40 };
    const observedAt = new Date(cond.observedAt);
    const validUntil = new Date(observedAt.getTime() + 60 * 60 * 1000);

    // Wave alert
    if (cond.waveHeight !== null) {
      if (cond.waveHeight > WAVE.danger) {
        alerts.push({
          id: `alert-wave-${location.lat.toFixed(2)}-${location.lon.toFixed(2)}-danger`,
          type: 'HIGH_WAVES',
          title: 'Dangerous Wave Advisory',
          description: `Extremely high wave heights of ${cond.waveHeight.toFixed(1)}m detected at query location. Unsafe for operations.`,
          severity: 'HIGH',
          issuedAt: observedAt,
          validUntil,
          source: 'Open-Meteo Marine API',
          isMockData: false,
        });
      } else if (cond.waveHeight > WAVE.caution) {
        alerts.push({
          id: `alert-wave-${location.lat.toFixed(2)}-${location.lon.toFixed(2)}-caution`,
          type: 'HIGH_WAVES',
          title: 'High Wave Watch',
          description: `Moderate wave heights of ${cond.waveHeight.toFixed(1)}m detected at query location. Exercise caution.`,
          severity: 'MEDIUM',
          issuedAt: observedAt,
          validUntil,
          source: 'Open-Meteo Marine API',
          isMockData: false,
        });
      }
    }

    // Wind alert
    if (cond.windSpeed !== null) {
      if (cond.windSpeed >= WIND.danger) {
        alerts.push({
          id: `alert-wind-${location.lat.toFixed(2)}-${location.lon.toFixed(2)}-danger`,
          type: 'STRONG_WINDS',
          title: 'Severe Gale Wind Warning',
          description: `Dangerous sustained gale force winds of ${cond.windSpeed.toFixed(0)} km/h detected at query location (gusts up to ${cond.windGust?.toFixed(0) || 'N/A'} km/h). Do not venture into the sea.`,
          severity: 'HIGH',
          issuedAt: observedAt,
          validUntil,
          source: 'Open-Meteo Weather API',
          isMockData: false,
        });
      } else if (cond.windSpeed >= WIND.caution) {
        alerts.push({
          id: `alert-wind-${location.lat.toFixed(2)}-${location.lon.toFixed(2)}-caution`,
          type: 'STRONG_WINDS',
          title: 'Strong Wind Advisory',
          description: `Strong sustained winds of ${cond.windSpeed.toFixed(0)} km/h detected at query location (gusts up to ${cond.windGust?.toFixed(0) || 'N/A'} km/h). Exercise heightened vigilance.`,
          severity: 'MEDIUM',
          issuedAt: observedAt,
          validUntil,
          source: 'Open-Meteo Weather API',
          isMockData: false,
        });
      } else if (cond.windSpeed >= WIND.low) {
        alerts.push({
          id: `alert-wind-${location.lat.toFixed(2)}-${location.lon.toFixed(2)}-low`,
          type: 'STRONG_WINDS',
          title: 'Wind Advisory',
          description: `Elevated sustained winds of ${cond.windSpeed.toFixed(0)} km/h detected at query location.`,
          severity: 'LOW',
          issuedAt: observedAt,
          validUntil,
          source: 'Open-Meteo Weather API',
          isMockData: false,
        });
      }
    }

    console.log(`[Alert Agent] Real alerts retrieved: ${alerts.length}`);
    console.log(`[Alert Agent] Completed`);
    return alerts;
  }

  async getAdvisories(): Promise<Advisory[]> {
    return [];
  }
}
