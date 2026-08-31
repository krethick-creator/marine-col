import { PostGISGeospatialProvider } from './PostGISGeospatialProvider'
import { env } from '../../config/env'
import type { GeospatialProvider } from './GeospatialProvider'
import { MockGeospatialProvider } from './MockGeospatialProvider'

let instance: GeospatialProvider | null = null

export function getGeospatialProvider(): GeospatialProvider {
  if (!instance) {
    if (env.useMockData) {
      instance = new MockGeospatialProvider()
      console.log('[Geospatial] Using MockGeospatialProvider (DEMO DATA)')
    }  else {
  instance = new PostGISGeospatialProvider()
  console.log('[Geospatial] Using PostGISGeospatialProvider (live)')
}
  }
  return instance
}

export type { GeospatialProvider }
