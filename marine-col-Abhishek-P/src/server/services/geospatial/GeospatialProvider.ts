import type { GeospatialSnapshot, LatLon } from '../../types'

export interface GeospatialProvider {
  readonly isMock: boolean
  readonly dataSource: string
  analyseRoute(
    origin: LatLon,
    destination: LatLon,
    waypoints?: LatLon[]
  ): Promise<GeospatialSnapshot>
  distanceToBoundaryNm(location: LatLon): Promise<number>
  nearestFishingZoneKm(location: LatLon): Promise<number>
}
