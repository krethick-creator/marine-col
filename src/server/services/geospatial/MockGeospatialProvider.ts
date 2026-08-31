import type { GeospatialProvider } from './GeospatialProvider'
import type { GeospatialSnapshot, LatLon, ProviderResult } from '../../types'

function haversineKm(a: LatLon, b: LatLon): number {
  const R = 6371
  const dLat = ((b.lat - a.lat) * Math.PI) / 180
  const dLon = ((b.lon - a.lon) * Math.PI) / 180
  const lat1 = (a.lat * Math.PI) / 180
  const lat2 = (b.lat * Math.PI) / 180
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x))
}

const MARITIME_BOUNDARY_REF: LatLon = { lat: 9.5, lon: 80.5 }

export class MockGeospatialProvider implements GeospatialProvider {
  readonly isMock = true
  readonly dataSource = '[DEMO] Mock Geospatial Provider'

  async analyseRoute(
    origin: LatLon,
    _destination: LatLon,
    _waypoints: LatLon[] = []
  ): Promise<ProviderResult<GeospatialSnapshot>> {
    const distKm = haversineKm(origin, MARITIME_BOUNDARY_REF)
    const distNm = distKm * 0.539957
    const nearBoundary = distNm < 60
    const veryNearBoundary = distNm < 10

    const data: GeospatialSnapshot = {
      routeIntersectsRestricted: false,
      routeNearBoundary: nearBoundary,
      distanceToBoundaryNm: parseFloat(distNm.toFixed(1)),
      restrictedZonesOnRoute: [],
      alternativeRouteAvailable: nearBoundary && !veryNearBoundary,
      isMockData: true,
      dataSource: this.dataSource,
      issuedAt: new Date(),
    }
    return { data, status: 'MOCK_DATA' }
  }

  async distanceToBoundaryNm(location: LatLon): Promise<number> {
    const km = haversineKm(location, MARITIME_BOUNDARY_REF)
    return parseFloat((km * 0.539957).toFixed(1))
  }

  async nearestFishingZoneKm(location: LatLon): Promise<number> {
    const base = haversineKm(location, { lat: location.lat, lon: location.lon + 0.1 })
    return parseFloat((base * 3 + 12).toFixed(1))
  }
}
