import type { SatelliteProvider } from './SatelliteProvider'
import type { SatelliteSnapshot, LatLon, ProviderResult } from '../../types'
import { getOceanProvider } from '../ocean'

export class MockSatelliteProvider implements SatelliteProvider {
  readonly isMock = true
  readonly dataSource = '[DEMO] Mock Satellite/INCOIS EO Provider'

  async getSnapshot(location: LatLon): Promise<ProviderResult<SatelliteSnapshot>> {
    const ocean = getOceanProvider()
    const zones = await ocean.getPFZZones(location)
    const snapshot: SatelliteSnapshot = {
      pfzZones: zones,
      sst: 28.5,
      chlorophyll: 1.6,
      chlorophyllGrid: null,
      sstGrid: null,
      isMockData: true,
      dataSource: this.dataSource,
      issuedAt: new Date(),
      providerStatus: 'MOCK_DATA',
    }
    return { data: snapshot, status: 'MOCK_DATA' }
  }
}
