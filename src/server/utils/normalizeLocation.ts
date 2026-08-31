import type { LatLon } from '../types';

/**
 * Normalizes various location inputs into a {lat, lon} object.
 * Returns null if coordinates are out of range or missing.
 * NEVER substitutes a default location.
 */
export function normalizeLocation(input: any): (LatLon & { name?: string }) | null {
  if (!input) return null;
  const lat = typeof input?.lat === 'number' ? input.lat : parseFloat(input?.lat);
  const lon = typeof input?.lon === 'number' ? input.lon : parseFloat(input?.lon);
  const name = typeof input?.name === 'string' ? input.name : undefined;

  if (Number.isNaN(lat) || Number.isNaN(lon)) return null;
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    console.warn('[Location] Invalid coordinates out of range', { lat, lon });
    return null;
  }
  return { lat, lon, name };
}
