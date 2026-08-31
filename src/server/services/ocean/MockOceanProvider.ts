import type { OceanProvider } from './OceanProvider'
import type { OceanSnapshot, FishingZone, LatLon, ProviderResult } from '../../types'

export class MockOceanProvider implements OceanProvider {
  readonly isMock = true
  readonly dataSource = '[DEMO] Mock Ocean/INCOIS Provider'

  async getSnapshot(_location: LatLon): Promise<ProviderResult<OceanSnapshot>> {
    const data: OceanSnapshot = {
      sst: 28.5,
      chlorophyll: 1.6,
      waveHeight: 1.2,
      swellPeriod: 8.5,
      swellDirection: 'SW',
      currentSpeed: 0.8,
      currentDirection: 'NE',
      isMockData: true,
      dataSource: this.dataSource,
      timestamp: new Date(),
    }
    return { data, status: 'MOCK_DATA' }
  }

  async getPFZZones(location: LatLon, _radiusKm = 100): Promise<FishingZone[]> {
    return [
      {
        id: 'pfz-alpha',
        name: 'PFZ Alpha - North Chennai',
        center: { lat: location.lat + 0.2, lon: location.lon + 0.15 },
        polygon: [],
        suitability: 'HIGH',
        sst: 28.5,
        chlorophyll: 1.8,
        distanceKm: 42,
        recommendation: 'NO_GO',
        reasons: ['High fishing suitability', 'Wave height exceeds safe limit after 11:00 AM', 'Return journey conflicts with deteriorating weather'],
        isMockData: true,
        dataSource: this.dataSource,
        issuedAt: new Date(),
      },
      {
        id: 'pfz-beta',
        name: 'PFZ Beta - South Coastal',
        center: { lat: location.lat - 0.2, lon: location.lon + 0.08 },
        polygon: [],
        suitability: 'MODERATE',
        sst: 27.8,
        chlorophyll: 1.4,
        distanceKm: 28,
        recommendation: 'CAUTION',
        reasons: ['Moderate fishing suitability', 'Lower wave exposure', 'Safe return window before conditions deteriorate', 'No boundary conflict on route'],
        isMockData: true,
        dataSource: this.dataSource,
        issuedAt: new Date(),
      },
      {
        id: 'pfz-gamma',
        name: 'PFZ Gamma - Nearshore Zone',
        center: { lat: location.lat + 0.0, lon: location.lon + 0.05 },
        polygon: [],
        suitability: 'MODERATE',
        sst: 29.1,
        chlorophyll: 1.1,
        distanceKm: 12,
        recommendation: 'GO',
        reasons: ['Short distance - quick return capability', 'Moderate suitability but safe conditions all day', 'Nearshore - lowest risk zone today'],
        isMockData: true,
        dataSource: this.dataSource,
        issuedAt: new Date(),
      },
    ]
  }
}
