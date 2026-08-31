import type { GeospatialSnapshot, LatLon, ProviderResult } from '../../types'

export interface GeospatialProvider {
  readonly isMock: boolean
  readonly dataSource: string
  analyseRoute(
    origin: LatLon,
    destination: LatLon,
    waypoints?: LatLon[]
  ): Promise<ProviderResult<GeospatialSnapshot>>;
  distanceToBoundaryNm(location: LatLon): Promise<number>
  nearestFishingZoneKm(location: LatLon): Promise<number>
}
