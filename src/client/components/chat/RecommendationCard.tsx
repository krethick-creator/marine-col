import { useState } from 'react'
import { ChevronDown, ChevronUp, Clock, Shield } from 'lucide-react'
import type { OrcaRecommendation, StatusLevel } from '../../types'

interface RecommendationCardProps {
  rec: OrcaRecommendation
}

const levelClass: Record<StatusLevel, string> = {
  GO:      'go',
  CAUTION: 'caution',
  NO_GO:   'nogo',
}

const levelLabel: Record<StatusLevel, string> = {
  GO:      '✅ GO',
  CAUTION: '⚠️ CAUTION',
  NO_GO:   '🚫 NO-GO',
}

const confidenceColor: Record<string, string> = {
  HIGH:   '#4ade80',
  MEDIUM: '#fbbf24',
  LOW:    '#f87171',
}

export default function RecommendationCard({ rec }: RecommendationCardProps) {
  const [showEvidence, setShowEvidence] = useState(false)
  const cls = levelClass[rec.level]

  return (
    <div className={`rec-card ${cls}`}>
      {/* Mock data notice */}
      {rec.isMockData && (
        <div style={{
          fontSize: 10.5, color: 'rgba(251,191,36,0.65)',
          marginBottom: 10, display: 'flex', alignItems: 'center', gap: 4
        }}>
          ⚠ DEMO DATA — Not real marine intelligence
        </div>
      )}

      {/* Status badge */}
      <div className={`rec-status-badge ${cls}`}>
        {levelLabel[rec.level]}
      </div>

      {/* Summary */}
      <div className="rec-summary">{rec.summary}</div>

      {/* Return time window */}
      {rec.returnWindow && (
        <div className="rec-return-time">
          <Clock size={14} style={{ color: 'rgba(126,200,227,0.7)', flexShrink: 0 }} />
          <div>
            <span style={{ color: 'rgba(126,200,227,0.6)', fontSize: 11 }}>Depart: </span>
            <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{rec.returnWindow.departureTime}</span>
            <span style={{ margin: '0 6px', color: 'rgba(255,255,255,0.2)' }}>·</span>
            <span style={{ color: 'rgba(126,200,227,0.6)', fontSize: 11 }}>Return by: </span>
            <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{rec.returnWindow.returnByTime}</span>
          </div>
        </div>
      )}

      {/* Evidence grid */}
      <div className="evidence-grid">
        {rec.evidence.slice(0, 6).map((item, i) => (
          <div key={i} className="evidence-item">
            <div className="evidence-label">
              {item.icon && <span style={{ marginRight: 4 }}>{item.icon}</span>}
              {item.label}
            </div>
            <div className="evidence-value">{item.value}</div>
            {item.meta && <div className="evidence-meta">{item.meta}</div>}
          </div>
        ))}
      </div>

      {/* Reasoning bullets */}
      {showEvidence && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'rgba(126,200,227,0.5)', marginBottom: 8 }}>
            Reasoning
          </div>
          {rec.reasoning.map((r, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, fontSize: 13, color: 'rgba(184,223,240,0.8)', marginBottom: 5 }}>
              <span style={{ color: 'rgba(126,200,227,0.5)', flexShrink: 0 }}>•</span>
              {r}
            </div>
          ))}
        </div>
      )}

      {/* Data freshness */}
      <div className="data-freshness">
        <div style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'rgba(126,200,227,0.4)', marginBottom: 4 }}>
          Data Freshness
        </div>
        <div className="freshness-row">
          <span className="freshness-label">Weather</span>
          <span className="freshness-value">{rec.dataFreshness.weather}</span>
        </div>
        <div className="freshness-row">
          <span className="freshness-label">Marine</span>
          <span className="freshness-value">{rec.dataFreshness.marine}</span>
        </div>
        <div className="freshness-row">
          <span className="freshness-label">Satellite / PFZ</span>
          <span className="freshness-value">{rec.dataFreshness.satellite}</span>
        </div>
        <div className="freshness-row" style={{ marginTop: 4 }}>
          <span className="freshness-label" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Shield size={10} /> Confidence
          </span>
          <span style={{ fontWeight: 600, fontSize: 12, color: confidenceColor[rec.confidence] }}>
            {rec.confidence}
          </span>
        </div>
      </div>

      {/* Evidence toggle */}
      <button className="evidence-btn" onClick={() => setShowEvidence(!showEvidence)}>
        {showEvidence ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        {showEvidence ? 'Hide details' : 'View evidence & reasoning'}
      </button>
    </div>
  )
}
