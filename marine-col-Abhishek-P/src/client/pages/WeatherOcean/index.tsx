// Weather & Ocean page stub
export default function WeatherOceanPage() {
  const forecast = [
    { label: 'Today',    wind: '18 km/h', waves: '1.2 m', condition: '⛅ Partly Cloudy', status: '🟡 CAUTION' },
    { label: 'Tomorrow', wind: '14 km/h', waves: '0.9 m', condition: '☀️ Clear',         status: '🟢 GO' },
    { label: 'Day 3',    wind: '38 km/h', waves: '2.9 m', condition: '🌧 Heavy Rain',     status: '🔴 NO-GO' },
  ]

  return (
    <div className="page-shell">
      <div className="page-header">
        <div>
          <h1 className="page-title">Weather & Ocean</h1>
          <p className="page-subtitle">Marine forecast, wave conditions, SST and more</p>
        </div>
        <div style={{ fontSize: 11, color: 'rgba(251,191,36,0.6)', padding: '4px 12px', borderRadius: 99, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>⚠ DEMO DATA</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
        {forecast.map((day) => (
          <div key={day.label} className="glass-card" style={{ padding: 18 }}>
            <div style={{ fontFamily: 'Outfit,sans-serif', fontSize: 16, fontWeight: 700, color: 'var(--text-main)', marginBottom: 10 }}>{day.label}</div>
            <div style={{ fontSize: 22, marginBottom: 6 }}>{day.condition.split(' ')[0]}</div>
            <div style={{ fontSize: 13, color: 'rgba(184,223,240,0.7)', marginBottom: 12 }}>{day.condition.slice(2)}</div>
            {[{ label: 'Wind', value: day.wind }, { label: 'Waves', value: day.waves }].map((item) => (
              <div key={item.label} className="evidence-item" style={{ marginBottom: 6 }}>
                <div className="evidence-label">{item.label}</div>
                <div className="evidence-value">{item.value}</div>
              </div>
            ))}
            <div style={{ marginTop: 10, fontWeight: 700, fontSize: 13 }}>{day.status}</div>
          </div>
        ))}
      </div>

      <div className="glass-card" style={{ padding: 24, textAlign: 'center' }}>
        <div style={{ fontSize: 13, color: 'rgba(184,223,240,0.5)' }}>
          📊 Recharts weather charts (hourly wind, wave height, SST, chlorophyll) — Phase 2 implementation
        </div>
      </div>
    </div>
  )
}
