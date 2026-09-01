import { cacheData, getCachedData } from '../offline/cacheService';
import { useAppStore } from '../../store';
import type { FishingZone } from '../../types';

export async function fetchFishingZones(lat: number, lon: number): Promise<{ ok: boolean; data?: FishingZone[]; error?: string; isCached?: boolean }> {
  const offlineMode = useAppStore.getState().offlineMode;

  if (offlineMode || !navigator.onLine) {
    const cached = await getCachedData('fishing_zones', lat, lon);
    if (cached) {
      return {
        ok: true,
        data: cached.data.map((z: any) => ({
          ...z,
          isCached: true,
          fetchedAt: cached.fetchedAt,
        })),
        isCached: true,
      };
    }
    return { ok: false, error: 'Offline: No cached fishing zone data available.' };
  }

  try {
    const res = await fetch(`/api/fishing/zones?lat=${lat}&lon=${lon}`);
    const json = await res.json();

    if (json.ok && Array.isArray(json.data)) {
      const locationName = useAppStore.getState().user.locationName || '';
      await cacheData('fishing_zones', lat, lon, locationName, json.data);
      return { ok: true, data: json.data };
    }
    return { ok: false, error: json.error || 'Failed to fetch fishing zones' };
  } catch (error: any) {
    console.error('Error fetching fishing zones:', error);
    const cached = await getCachedData('fishing_zones', lat, lon);
    if (cached) {
      return {
        ok: true,
        data: cached.data.map((z: any) => ({
          ...z,
          isCached: true,
          fetchedAt: cached.fetchedAt,
        })),
        isCached: true,
      };
    }
    return { ok: false, error: error.message || 'Failed to fetch fishing zones' };
  }
}
