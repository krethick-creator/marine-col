import { mockFishingZones } from '../../services/mockProviders/mockData'
import type { StatusLevel, FishingZone } from '../../types'

const statusConfig: Record<StatusLevel, { label: string; color: string; bg: string; border: string }> = {
  GO:      { label: '✅ RECOMMENDED',      color: '#047857', bg: 'rgba(16,185,129,0.15)',  border: 'rgba(16,185,129,0.3)' },
  CAUTION: { label: '⚠️ WITH CAUTION',    color: '#b45309', bg: 'rgba(245,158,11,0.15)', border: 'rgba(245,158,11,0.3)' },
  NO_GO:   { label: '🚫 NOT RECOMMENDED',  color: '#b91c1c', bg: 'rgba(239,68,68,0.15)',  border: 'rgba(239,68,68,0.3)' },
}

const suitabilityColor: Record<string, string> = {
  HIGH: '#047857', MODERATE: '#b45309', LOW: '#b91c1c',
}

export default function FishingZonesPage() {
  return (
    <div className="page-shell">
      <div className="page-header">
        <div>
          <h1 className="page-title">Fishing Zones</h1>
          <p className="page-subtitle">ORCA evaluates each zone by safety — not just fish availability</p>
        </div>
        <div style={{ fontSize: 11, color: 'rgba(251,191,36,0.6)', padding: '4px 12px', borderRadius: 99, background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.2)' }}>
          ⚠ DEMO DATA
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {mockFishingZones.map((zone: FishingZone) => {
          const cfg = statusConfig[zone.recommendation]
          return (
            <div key={zone.id} className="glass-card" style={{ padding: 20, background: cfg.bg, borderColor: cfg.border }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
                <div>
                  <div style={{ fontFamily: 'Outfit,sans-serif', fontSize: 17, fontWeight: 700, color: 'var(--text-main)' }}>{zone.name}</div>
                  <div style={{ fontSize: 12, color: 'rgba(184,223,240,0.45)', marginTop: 2 }}>{zone.distanceKm} km from Chennai Harbour</div>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: suitabilityColor[zone.suitability], padding: '3px 10px', borderRadius: 99, background: 'rgba(255,255,255,0.06)', border: `1px solid ${suitabilityColor[zone.suitability]}33` }}>
                    Fish: {zone.suitability}
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: cfg.color }}>{cfg.label}</div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 8, marginBottom: 12 }}>
                {[
                  { label: 'SST', value: `${zone.sst}°C` },
                  { label: 'Chlorophyll', value: `${zone.chlorophyll} mg/m³` },
                ].map((item) => (
                  <div key={item.label} className="evidence-item">
                    <div className="evidence-label">{item.label}</div>
                    <div className="evidence-value">{item.value}</div>
                  </div>
                ))}
              </div>

              <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: 10 }}>
                <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'rgba(126,200,227,0.4)', marginBottom: 6 }}>
                  ORCA Analysis
                </div>
                {zone.reasons.map((r: string, i: number) => (
                  <div key={i} style={{ display: 'flex', gap: 8, fontSize: 13, color: 'rgba(184,223,240,0.75)', marginBottom: 4 }}>
                    <span style={{ color: cfg.color, flexShrink: 0 }}>•</span> {r}
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
