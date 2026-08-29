import { mockTripPlan } from '../../services/mockProviders/mockData'
import type { StatusLevel, DayPlan, TimeSlot } from '../../types'

const statusColors: Record<StatusLevel, { bg: string; border: string; text: string; dot: string }> = {
  GO:      { bg: 'rgba(16,185,129,0.15)',   border: 'rgba(16,185,129,0.3)',   text: '#047857', dot: 'var(--status-go)' },
  CAUTION: { bg: 'rgba(245,158,11,0.15)',  border: 'rgba(245,158,11,0.3)',  text: '#b45309', dot: 'var(--status-caution)' },
  NO_GO:   { bg: 'rgba(239,68,68,0.15)',   border: 'rgba(239,68,68,0.3)',   text: 'var(--status-nogo)', dot: 'var(--status-nogo)' },
}
const statusLabel: Record<StatusLevel, string> = {
  GO: '✅ GO', CAUTION: '⚠️ CAUTION', NO_GO: '🚫 NO-GO',
}

export default function TripPlannerPage() {
  const plan = mockTripPlan

  return (
    <div className="page-shell">
      <div className="page-header">
        <div>
          <h1 className="page-title">Trip Planner</h1>
          <p className="page-subtitle">3-day intelligent fishing trip plan — {plan.startLocationName}</p>
        </div>
        {plan.isMockData && (
          <div style={{ fontSize: 11, color: 'rgba(251,191,36,0.6)', padding: '4px 12px', borderRadius: 99, background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.2)' }}>
            ⚠ DEMO DATA
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
        {plan.dayPlans.map((day: DayPlan) => {
          const col = statusColors[day.status]
          return (
            <div key={day.dayNumber} className="glass-card" style={{ padding: 20, background: col.bg, borderColor: col.border }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div style={{ fontFamily: 'Outfit,sans-serif', fontSize: 16, fontWeight: 700, color: 'var(--text-main)' }}>
                  Day {day.dayNumber}
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: col.text }}>{statusLabel[day.status]}</div>
              </div>

              <div style={{ fontSize: 12, color: 'rgba(184,223,240,0.5)', marginBottom: 12 }}>{day.weatherSummary}</div>

              {([day.morning, day.afternoon, day.evening] as TimeSlot[]).map((slot) => {
                const sc = statusColors[slot.status]
                return (
                  <div key={slot.label} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 8 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: sc.dot, flexShrink: 0, marginTop: 5 }} />
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: sc.text }}>{slot.label}</div>
                      <div style={{ fontSize: 12, color: 'rgba(184,223,240,0.65)' }}>{slot.notes}</div>
                    </div>
                  </div>
                )
              })}

              {day.recommendedDepartureTime && (
                <div style={{ marginTop: 12, padding: '8px 12px', borderRadius: 8, background: 'rgba(30,95,168,0.15)', border: '1px solid rgba(30,95,168,0.25)', fontSize: 12 }}>
                  <span style={{ color: 'rgba(126,200,227,0.6)' }}>Depart: </span>
                  <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{day.recommendedDepartureTime}</span>
                  {day.recommendedReturnTime && (
                    <>
                      <span style={{ margin: '0 6px', color: 'rgba(255,255,255,0.2)' }}>·</span>
                      <span style={{ color: 'rgba(126,200,227,0.6)' }}>Return: </span>
                      <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{day.recommendedReturnTime}</span>
                    </>
                  )}
                </div>
              )}

              {day.warnings.map((w: string, i: number) => (
                <div key={i} style={{ marginTop: 8, fontSize: 11.5, color: 'var(--status-nogo)', display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                  <span>⚠</span> {w}
                </div>
              ))}
            </div>
          )
        })}
      </div>
    </div>
  )
}
