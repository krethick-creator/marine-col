import { cacheData, getCachedData } from '../offline/cacheService';
import { useAppStore } from '../../store';

export async function fetchBoundaries(lat: number, lon: number): Promise<any> {
  const offlineMode = useAppStore.getState().offlineMode;
  
  if (offlineMode || !navigator.onLine) {
    const cached = await getCachedData('boundaries', lat, lon);
    if (cached) {
      return {
        ok: true,
        data: {
          boundaries: cached.data.map((b: any) => ({
            ...b,
            isCached: true,
            fetchedAt: cached.fetchedAt
          }))
        }
      };
    }
    return { ok: false, error: 'Offline: No cached boundary data available.' };
  }

  try {
    const res = await fetch(`/api/geospatial/boundaries?lat=${lat}&lon=${lon}`);
    const json = await res.json();
    
    if (json.ok) {
      const locationName = useAppStore.getState().user.locationName || '';
      await cacheData('boundaries', lat, lon, locationName, json.data.boundaries);
    }
    
    return json;
  } catch (error: any) {
    console.error('Error fetching boundaries:', error);
    const cached = await getCachedData('boundaries', lat, lon);
    if (cached) {
      return {
        ok: true,
        data: {
          boundaries: cached.data.map((b: any) => ({
            ...b,
            isCached: true,
            fetchedAt: cached.fetchedAt
          }))
        }
      };
    }
    return { ok: false, error: error.message || 'Failed to fetch boundaries' };
  }
}
