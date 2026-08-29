import { env } from '../../config/env'
import type { SatelliteProvider } from './SatelliteProvider'
import { MockSatelliteProvider } from './MockSatelliteProvider'

let instance: SatelliteProvider | null = null

export function getSatelliteProvider(): SatelliteProvider {
  if (!instance) {
    if (env.useMockData) {
      instance = new MockSatelliteProvider()
      console.log('[Satellite] Using MockSatelliteProvider (DEMO DATA)')
    } else {
      console.warn('[Satellite] Real provider not yet implemented — falling back to mock')
      instance = new MockSatelliteProvider()
    }
  }
  return instance
}

export type { SatelliteProvider }
