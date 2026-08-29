import type { SatelliteSnapshot, LatLon } from '../../types'

export interface SatelliteProvider {
  readonly isMock: boolean
  readonly dataSource: string
  getSnapshot(location: LatLon): Promise<SatelliteSnapshot>
}
