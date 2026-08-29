// Live Map page — MapLibre integration placeholder
export default function LiveMapPage() {
  return (
    <div className="page-shell" style={{ padding: 0, position: 'relative', flex: 1 }}>
      {/* Map placeholder until MapLibre is wired */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        height: '100%',
        background: 'radial-gradient(ellipse 60% 50% at 50% 50%, rgba(30,95,168,0.12) 0%, transparent 70%)',
      }}>
        <div style={{ fontSize: 48 }}>🗺</div>
        <div style={{ fontFamily: 'Outfit,sans-serif', fontSize: 24, fontWeight: 700, color: 'var(--text-main)' }}>
          Live Marine Map
        </div>
        <div style={{ fontSize: 14, color: 'rgba(184,223,240,0.5)', textAlign: 'center', maxWidth: 380 }}>
          Interactive MapLibre map with fishing zones, PFZ overlays, weather layers, boundaries, and vessel tracking coming in Phase 2.
        </div>
        <div style={{
          padding: '8px 18px', borderRadius: 99,
          background: 'rgba(30,95,168,0.15)',
          border: '1px solid rgba(45,139,186,0.3)',
          fontSize: 12, color: 'rgba(126,200,227,0.7)',
        }}>
          🔵 Fishing Zones · 🟡 PFZ · ⚠ Hazards · 🚩 Boundaries · 🌡 SST · 🌊 Waves
        </div>
      </div>
    </div>
  )
}
