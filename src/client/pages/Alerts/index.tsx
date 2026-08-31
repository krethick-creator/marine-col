import { useEffect, useState } from 'react'
import { fetchActiveAlerts } from '../../services/api/alertService'
import { useAppStore } from '../../store'
import type { Alert } from '../../types'

const severityConfig: Record<Alert['severity'], { color: string; bg: string; border: string; icon: string }> = {
  CRITICAL: { color: '#f87171', bg: 'rgba(239,68,68,0.10)', border: 'rgba(239,68,68,0.3)', icon: '🚨' },
  HIGH:     { color: '#fb923c', bg: 'rgba(251,146,60,0.10)', border: 'rgba(251,146,60,0.3)', icon: '⛔' },
  MEDIUM:   { color: '#fbbf24', bg: 'rgba(245,158,11,0.10)', border: 'rgba(245,158,11,0.3)', icon: '⚠️' },
  LOW:      { color: '#7ec8e3', bg: 'rgba(126,200,227,0.06)', border: 'rgba(126,200,227,0.2)', icon: 'ℹ️' },
}

export default function AlertsPage() {
  const user = useAppStore(state => state.user)
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user?.location?.lat && user?.location?.lon) {
      setLoading(true)
      fetchActiveAlerts(user.location.lat, user.location.lon)
        .then(data => {
          setAlerts(data)
          setLoading(false)
        })
        .catch(() => setLoading(false))
    }
  }, [user?.location])

  return (
    <div className="page-shell">
      <div className="page-header">
        <div>
          <h1 className="page-title">Alerts & Warnings</h1>
          <p className="page-subtitle">Active marine advisories and safety alerts for your region</p>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'rgba(255,255,255,0.6)' }}>
          Loading active alerts...
        </div>
      ) : alerts.length === 0 ? (
        <div className="glass-card" style={{ padding: 40, textAlign: 'center' }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>✅</div>
          <div style={{ color: '#4ade80', fontWeight: 600 }}>No active alerts</div>
          <div style={{ fontSize: 13, color: 'rgba(184,223,240,0.4)', marginTop: 4 }}>All clear in your region</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {alerts.map((alert: Alert) => {
            const cfg = severityConfig[alert.severity] || severityConfig.MEDIUM
            return (
              <div key={alert.id} className="glass-card" style={{ padding: 18, background: cfg.bg, borderColor: cfg.border }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                  <span style={{ fontSize: 24, flexShrink: 0 }}>{cfg.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 6 }}>
                      <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-main)' }}>{alert.title}</div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: cfg.color, padding: '2px 8px', borderRadius: 99, background: `${cfg.color}1a`, border: `1px solid ${cfg.color}44` }}>
                        {alert.severity}
                      </div>
                      {alert.isMockData && (
                        <div style={{ fontSize: 10, color: 'rgba(251,191,36,0.5)' }}>DEMO</div>
                      )}
                    </div>
                    <div style={{ fontSize: 13.5, color: 'rgba(184,223,240,0.75)', lineHeight: 1.6, marginBottom: 8 }}>
                      {alert.description}
                    </div>
                    <div style={{ fontSize: 11, color: 'rgba(126,200,227,0.4)', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                      <span>Source: {alert.source}</span>
                      <span>Issued: {alert.issuedAt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                      {alert.validUntil && (
                        <span>Valid until: {alert.validUntil.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
