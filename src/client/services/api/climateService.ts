import { cacheData, getCachedData } from '../offline/cacheService';
import { useAppStore } from '../../store';

export async function fetchClimateArchive(lat: number, lon: number): Promise<any> {
  const offlineMode = useAppStore.getState().offlineMode;
  const locationName = useAppStore.getState().user.locationName || '';

  if (offlineMode || !navigator.onLine) {
    const cached = await getCachedData('climate', lat, lon);
    if (cached) {
      return {
        ...cached.data,
        isCached: true,
        fetchedAt: cached.fetchedAt
      };
    }
    throw new Error('Offline: No cached climate data available.');
  }

  try {
    const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&start_date=2025-01-01&end_date=2025-12-31&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max&timezone=auto`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Historical archive failed');
    const json = await res.json();

    await cacheData('climate', lat, lon, locationName, json);

    return json;
  } catch (error: any) {
    const cached = await getCachedData('climate', lat, lon);
    if (cached) {
      return {
        ...cached.data,
        isCached: true,
        fetchedAt: cached.fetchedAt
      };
    }
    throw error;
  }
}
