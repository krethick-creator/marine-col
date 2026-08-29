import type { AdvisoryProvider } from './AdvisoryProvider'
import type { Alert, Advisory, LatLon } from '../../types'

export class MockAdvisoryProvider implements AdvisoryProvider {
  readonly isMock = true
  readonly dataSource = '[DEMO] Mock IMD Advisory Provider'

  async getActiveAlerts(_location: LatLon, _radiusKm = 200): Promise<Alert[]> {
    return [
      {
        id: 'alert-001',
        type: 'HIGH_WAVES',
        title: 'High Wave Advisory',
        description: 'Wave heights of 1.8–2.2 m expected along Chennai–Pondicherry coast after 12:00 PM IST.',
        severity: 'MEDIUM',
        issuedAt: new Date(Date.now() - 2 * 3600_000),
        validUntil: new Date(Date.now() + 8 * 3600_000),
        source: '[DEMO] IMD Marine Advisory',
        isMockData: true,
      },
      {
        id: 'alert-002',
        type: 'STRONG_WINDS',
        title: 'Strong Wind Warning',
        description: 'Wind speeds of 22–28 km/h from SW direction expected afternoon onwards.',
        severity: 'LOW',
        issuedAt: new Date(Date.now() - 3600_000),
        source: '[DEMO] IMD Wind Advisory',
        isMockData: true,
      },
    ]
  }

  async getAdvisories(): Promise<Advisory[]> {
    return [
      {
        id: 'adv-001',
        title: 'Seasonal Marine Advisory — Bay of Bengal',
        body: 'Fishermen are advised to exercise caution. Afternoon sea conditions may deteriorate. Return to harbour before 12:00 PM on deteriorating days.',
        validFrom: new Date(Date.now() - 7 * 86_400_000),
        validUntil: new Date(Date.now() + 7 * 86_400_000),
        source: '[DEMO] IMD Coastal Division',
        isMockData: true,
      },
    ]
  }
}
