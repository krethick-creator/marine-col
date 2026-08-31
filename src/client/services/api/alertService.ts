import type { Alert } from '../../types'

export async function fetchActiveAlerts(lat: number, lon: number): Promise<Alert[]> {
  try {
    const res = await fetch(`/api/alerts?lat=${lat}&lon=${lon}`)
    if (!res.ok) throw new Error('Failed to fetch alerts')
    const json = await res.json()
    
    return (json.data || []).map((alert: any) => ({
      ...alert,
      issuedAt: new Date(alert.issuedAt),
      validUntil: alert.validUntil ? new Date(alert.validUntil) : undefined,
    }))
  } catch (error) {
    console.error('Error fetching active alerts:', error)
    return []
  }
}
