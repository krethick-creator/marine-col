import type { OceanSnapshot, FishingZone, LatLon, ProviderResult } from '../../types'

export interface OceanProvider {
  readonly isMock: boolean
  readonly dataSource: string
  getSnapshot(location: LatLon): Promise<ProviderResult<OceanSnapshot>>;
  getPFZZones(location: LatLon, radiusKm?: number): Promise<FishingZone[]>
}
