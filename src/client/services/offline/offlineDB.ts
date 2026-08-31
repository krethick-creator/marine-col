import { openDB } from 'idb';
import type { DBSchema, IDBPDatabase } from 'idb';

interface OrcaDBSchema extends DBSchema {
  weather: { key: string; value: CacheItem };
  ocean: { key: string; value: CacheItem };
  alerts: { key: string; value: CacheItem };
  boundaries: { key: string; value: CacheItem };
  reports: { key: string; value: CacheItem };
  climate: { key: string; value: CacheItem };
  location: { key: string; value: CacheItem };
  metadata: { key: string; value: CacheItem };
  caches: { key: string; value: CacheItem; indexes: { 'by-type': string; 'by-location': string } };
}

interface CacheItem {
  id: string;
  type: string;
  lat: number;
  lon: number;
  locationName: string;
  data: any;
  fetchedAt: Date;
  dataSource?: string;
  isCached?: boolean;
  version?: string;
}

const DB_NAME = 'orca-offline-db';
const DB_VERSION = 2; // Bumped version

let dbPromise: Promise<IDBPDatabase<OrcaDBSchema>>;

export function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<OrcaDBSchema>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion, newVersion, transaction) {
        if (!db.objectStoreNames.contains('caches')) {
          const store = db.createObjectStore('caches', { keyPath: 'id' });
          store.createIndex('by-type', 'type');
          store.createIndex('by-location', 'locationName');
        }
        
        const stores = ['weather', 'ocean', 'alerts', 'boundaries', 'reports', 'climate', 'location', 'metadata'];
        stores.forEach(name => {
          if (!db.objectStoreNames.contains(name as any)) {
            db.createObjectStore(name as any, { keyPath: 'id' });
          }
        });
      },
    });
  }
  return dbPromise;
}
