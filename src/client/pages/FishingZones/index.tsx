import { useEffect, useState } from 'react'
import type { StatusLevel, FishingZone } from '../../types'
import { useTranslation } from '../../locales'
import { useAppStore } from '../../store'
import { fetchFishingZones } from '../../services/api/fishingService'
import { MapPin, RefreshCw } from 'lucide-react'

const statusConfig: Record<StatusLevel, { labelKey: string; color: string; bg: string; border: string }> = {
  GO:      { labelKey: 'fishing.recommended',    color: '#047857', bg: 'rgba(16,185,129,0.15)',  border: 'rgba(16,185,129,0.3)' },
  CAUTION: { labelKey: 'fishing.withCaution',    color: '#b45309', bg: 'rgba(245,158,11,0.15)', border: 'rgba(245,158,11,0.3)' },
  NO_GO:   { labelKey: 'fishing.notRecommended',  color: '#b91c1c', bg: 'rgba(239,68,68,0.15)',  border: 'rgba(239,68,68,0.3)' },
}

const suitabilityColor: Record<string, string> = {
  HIGH: '#047857', MODERATE: '#b45309', LOW: '#b91c1c',
}

export default function FishingZonesPage() {
  const { t } = useTranslation()
  const { user } = useAppStore()

  const lat = user?.location?.lat ?? 13.0827
  const lon = user?.location?.lon ?? 80.2707
  const locationName = user?.locationName || 'Chennai Harbour'

  const [zones, setZones] = useState<FishingZone[]>([])
  const [loading, setLoading] = useState(true)
  const [_error, setError] = useState<string | null>(null)

  const loadZones = async () => {
    setLoading(true)
    setError(null)
    const result = await fetchFishingZones(lat, lon)
    if (result.ok && result.data) {
      setZones(result.data)
    } else {
      setZones([])
      setError(result.error || 'Fishing zone data currently unavailable')
    }
    setLoading(false)
  }

  useEffect(() => {
    loadZones()
  }, [lat, lon])

  return (
    <div className="page-shell">
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('fishing.title')}</h1>
          <p className="page-subtitle">{t('fishing.subtitle')}</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="glass" style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--accent-blue)', padding: '6px 14px', borderRadius: 99, display: 'flex', alignItems: 'center', gap: 6 }}>
            <MapPin size={14} />
            {locationName}
          </div>
          <button
            onClick={loadZones}
            className="glass"
            style={{ padding: '6px 12px', borderRadius: 99, background: 'rgba(255,255,255,0.05)', color: 'var(--text-main)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, border: '1px solid rgba(255,255,255,0.1)' }}
          >
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <div className="glass-card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-light)' }}>
          <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 12px auto', color: 'var(--accent-blue)' }} />
          <div style={{ fontSize: 14, fontWeight: 600 }}>Fetching real-time fishing zone data...</div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>Querying PostGIS spatial registry & NOAA satellite thermal data</div>
        </div>
      ) : zones.length === 0 ? (
        <div className="glass-card" style={{ padding: '36px 24px', textAlign: 'center', background: 'rgba(15, 23, 42, 0.4)' }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>🌊</div>
          <h3 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-main)', marginBottom: 8 }}>
            Fishing zone data currently unavailable
          </h3>
          <p style={{ fontSize: 13, color: 'rgba(184,223,240,0.6)', maxWidth: 480, margin: '0 auto 16px auto', lineHeight: 1.5 }}>
            No active potential fishing zone (PFZ) advisories or thermal front data could be retrieved for <strong style={{ color: 'var(--text-main)' }}>{locationName}</strong> at this time.
          </p>
          <div className="glass" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 14px', borderRadius: 99, fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#F59E0B' }} />
            Real-time PostGIS & NOAA Satellite Data Architecture
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {zones.map((zone: FishingZone) => {
            const cfg = statusConfig[zone.recommendation] || statusConfig.GO
            return (
              <div key={zone.id} className="glass-card" style={{ padding: 20, background: cfg.bg, borderColor: cfg.border }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
                  <div>
                    <div style={{ fontFamily: 'Outfit,sans-serif', fontSize: 17, fontWeight: 700, color: 'var(--text-main)' }}>{zone.name}</div>
                    <div style={{ fontSize: 12, color: 'rgba(184,223,240,0.5)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span>{zone.distanceKm} km from {locationName}</span>
                      {zone.dataSource && (
                        <span style={{ background: 'rgba(255,255,255,0.08)', padding: '2px 8px', borderRadius: 99, fontSize: 10.5, color: 'var(--accent-blue)', fontWeight: 600 }}>
                          {zone.dataSource}
                        </span>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: suitabilityColor[zone.suitability] || '#047857', padding: '3px 10px', borderRadius: 99, background: 'rgba(255,255,255,0.06)', border: `1px solid ${suitabilityColor[zone.suitability] || '#047857'}33` }}>
                      {t('fishing.fishSuitability')} {zone.suitability}
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: cfg.color }}>{t(cfg.labelKey as any)}</div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 8, marginBottom: 12 }}>
                  {[
                    { label: t('fishing.sst'), value: `${zone.sst}°C` },
                    { label: t('fishing.chlorophyll'), value: `${zone.chlorophyll} mg/m³` },
                  ].map((item) => (
                    <div key={item.label} className="evidence-item">
                      <div className="evidence-label">{item.label}</div>
                      <div className="evidence-value">{item.value}</div>
                    </div>
                  ))}
                </div>

                {zone.reasons && zone.reasons.length > 0 && (
                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: 10 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'rgba(126,200,227,0.4)', marginBottom: 6 }}>
                      {t('fishing.orcaAnalysis')}
                    </div>
                    {zone.reasons.map((r: string, i: number) => (
                      <div key={i} style={{ display: 'flex', gap: 8, fontSize: 13, color: 'rgba(184,223,240,0.75)', marginBottom: 4 }}>
                        <span style={{ color: cfg.color, flexShrink: 0 }}>•</span> {r}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
