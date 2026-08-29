import type { SatelliteProvider } from './SatelliteProvider'
import type { SatelliteSnapshot, LatLon } from '../../types'
import { getOceanProvider } from '../ocean'

export class MockSatelliteProvider implements SatelliteProvider {
  readonly isMock = true
  readonly dataSource = '[DEMO] Mock Satellite/INCOIS EO Provider'

  async getSnapshot(location: LatLon): Promise<SatelliteSnapshot> {
    const ocean = getOceanProvider()
    const zones = await ocean.getPFZZones(location)
    return {
      pfzZones: zones,
      chlorophyllGrid: null,   // Phase 7: GeoJSON
      sstGrid: null,           // Phase 7: GeoJSON
      isMockData: true,
      dataSource: this.dataSource,
      issuedAt: new Date(),
    }
  }
}
