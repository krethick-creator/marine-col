import type { Alert, Advisory, LatLon } from '../../types'

export interface AdvisoryProvider {
  readonly isMock: boolean
  readonly dataSource: string
  getActiveAlerts(location: LatLon, radiusKm?: number): Promise<Alert[]>
  getAdvisories(): Promise<Advisory[]>
}
