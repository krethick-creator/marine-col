import type { Alert } from '../../types'
import { cacheData, getCachedData } from '../offline/cacheService';
import { useAppStore } from '../../store';

export async function fetchActiveAlerts(lat: number, lon: number): Promise<Alert[]> {
  const offlineMode = useAppStore.getState().offlineMode;
  
  if (offlineMode || !navigator.onLine) {
    const cached = await getCachedData('alerts', lat, lon);
    if (cached) {
      return cached.data.map((alert: any) => ({
        ...alert,
        isCached: true,
        fetchedAt: cached.fetchedAt
      }));
    }
    return [];
  }

  try {
    const res = await fetch(`/api/alerts?lat=${lat}&lon=${lon}`)
    if (!res.ok) throw new Error('Failed to fetch alerts')
    const json = await res.json()
    
    const parsedAlerts = (json.data || []).map((alert: any) => ({
      ...alert,
      issuedAt: new Date(alert.issuedAt),
      validUntil: alert.validUntil ? new Date(alert.validUntil) : undefined,
    }))
    
    const locationName = useAppStore.getState().user.locationName || '';
    await cacheData('alerts', lat, lon, locationName, parsedAlerts);
    
    return parsedAlerts;
  } catch (error) {
    console.error('Error fetching active alerts:', error)
    // Fallback to cache if request fails
    const cached = await getCachedData('alerts', lat, lon);
    if (cached) {
      return cached.data.map((alert: any) => ({
        ...alert,
        isCached: true,
        fetchedAt: cached.fetchedAt
      }));
    }
    return []
  }
}
