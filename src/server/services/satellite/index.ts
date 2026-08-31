import { env } from '../../config/env'
import type { SatelliteProvider } from './SatelliteProvider'
import { MockSatelliteProvider } from './MockSatelliteProvider'
import { RealSatelliteProvider } from './RealSatelliteProvider'

let instance: SatelliteProvider | null = null

export function getSatelliteProvider(): SatelliteProvider {
  if (instance) return instance;
  
  try {
    instance = new RealSatelliteProvider();
    console.log('[Satellite] Using RealSatelliteProvider');
  } catch (e) {
    console.warn('[Satellite] Real provider not yet implemented — falling back to mock');
    instance = new MockSatelliteProvider();
    console.log('[Satellite] Using MockSatelliteProvider (DEMO DATA)');
  }
  return instance
}

export type { SatelliteProvider }
