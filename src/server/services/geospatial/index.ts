import { env } from '../../config/env'
import type { GeospatialProvider } from './GeospatialProvider'
import { MockGeospatialProvider } from './MockGeospatialProvider'

let instance: GeospatialProvider | null = null

export function getGeospatialProvider(): GeospatialProvider {
  if (!instance) {
    if (env.useMockData) {
      instance = new MockGeospatialProvider()
      console.log('[Geospatial] Using MockGeospatialProvider (DEMO DATA)')
    } else {
      console.warn('[Geospatial] PostGIS provider not yet implemented — falling back to mock')
      instance = new MockGeospatialProvider()
    }
  }
  return instance
}

export type { GeospatialProvider }
