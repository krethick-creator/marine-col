export default function BoundariesPage() {
  return (
    <div className="page-shell">
      <div className="page-header">
        <div>
          <h1 className="page-title">Boundaries</h1>
          <p className="page-subtitle">International maritime boundaries, safety buffers, and restricted zones</p>
        </div>
      </div>
      <div className="glass-card" style={{ padding: 24 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
          {[
            { icon: '🚩', label: 'International Boundary', value: '62 nm away', color: '#f87171' },
            { icon: '⚠️', label: 'Safety Buffer (5 nm)', value: 'Active', color: '#fbbf24' },
            { icon: '🛑', label: 'Restricted Zones', value: '2 active', color: '#fb923c' },
            { icon: '🐠', label: 'Marine Protected Areas', value: '1 nearby', color: '#4ade80' },
          ].map((item) => (
            <div key={item.label} className="evidence-item">
              <div style={{ fontSize: 20, marginBottom: 6 }}>{item.icon}</div>
              <div className="evidence-label">{item.label}</div>
              <div className="evidence-value" style={{ color: item.color }}>{item.value}</div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 20, padding: '12px 16px', borderRadius: 10, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', fontSize: 13, color: 'rgba(184,223,240,0.7)' }}>
          🗺 Full geofenced boundary visualization with route intersection checking — Phase 2 (MapLibre integration)
        </div>
      </div>
    </div>
  )
}
