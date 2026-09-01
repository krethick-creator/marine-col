import { getDB } from './offlineDB';

const VALID_STORES = ['weather', 'ocean', 'alerts', 'boundaries', 'reports', 'climate', 'location', 'metadata'];

export async function cacheData(
  type: string,
  lat: number,
  lon: number,
  locationName: string,
  data: any,
  dataSource?: string,
  version?: string
) {
  try {
    const db = await getDB();
    const id = `${type}_${lat.toFixed(4)}_${lon.toFixed(4)}`;
    
    const payload = {
      id,
      type,
      lat,
      lon,
      locationName,
      data,
      fetchedAt: new Date(),
      dataSource: dataSource || 'ORCA-System',
      isCached: true,
      version,
    };

    const storeName = VALID_STORES.includes(type) ? type : 'caches';
    await db.put(storeName as any, payload);
    
    // Also store in 'caches' for backwards compatibility if needed, or just rely on specific stores.
    // We will just use specific stores.
  } catch (error) {
    console.error(`Failed to cache ${type} data:`, error);
  }
}

export async function getCachedData(type: string, lat: number, lon: number) {
  try {
    const db = await getDB();
    const id = `${type}_${lat.toFixed(4)}_${lon.toFixed(4)}`;
    const storeName = VALID_STORES.includes(type) ? type : 'caches';
    const cached = await db.get(storeName as any, id);
    
    // Fallback to legacy caches store if not found in specific store
    if (!cached && storeName !== 'caches') {
      const legacyCached = await db.get('caches', id);
      return legacyCached ? legacyCached : null;
    }
    
    return cached ? cached : null;
  } catch (error) {
    console.error(`Failed to get cached ${type} data:`, error);
    return null;
  }
}
