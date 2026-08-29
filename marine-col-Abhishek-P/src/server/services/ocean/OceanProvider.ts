import type { OceanSnapshot, FishingZone, LatLon } from '../../types'

export interface OceanProvider {
  readonly isMock: boolean
  readonly dataSource: string
  getSnapshot(location: LatLon): Promise<OceanSnapshot>
  getPFZZones(location: LatLon, radiusKm?: number): Promise<FishingZone[]>
}
