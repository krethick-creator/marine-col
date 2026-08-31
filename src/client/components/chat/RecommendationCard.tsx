import { useState } from 'react'
import { ChevronDown, ChevronUp, Clock, Shield } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { OrcaRecommendation, StatusLevel } from '../../types'
import { useTranslation } from '../../locales'

interface RecommendationCardProps {
  rec: OrcaRecommendation
}

const levelClass: Record<StatusLevel, string> = {
  GO:      'go',
  CAUTION: 'caution',
  NO_GO:   'nogo',
}

const getLevelLabel = (level: StatusLevel, t: any): string => {
  switch (level) {
    case 'GO': return t('risk.goLabel')
    case 'CAUTION': return t('risk.cautionLabel')
    case 'NO_GO': return t('risk.noGoLabel')
    default: return level
  }
}

const confidenceColor: Record<string, string> = {
  HIGH:   '#4ade80',
  MEDIUM: '#fbbf24',
  LOW:    '#f87171',
}

const translateReasoningItem = (item: string, t: any): string => {
  if (item === 'All safety parameters are within normal limits.') return t('risk.reasoning.allSafe') || item;
  if (item.includes('High wave conditions at target PFZ')) return t('risk.reasoning.highWavesPFZ') || item;
  if (item.includes('Active cyclone advisory')) return t('risk.reasoning.cycloneAdvisory') || item;
  if (item.includes('Return trip conditions are dangerous')) return t('risk.reasoning.dangerousReturn') || item;
  if (item.includes('Proximity to international boundary')) return t('risk.reasoning.boundaryProximity') || item;
  if (item.includes('Weather will worsen in the afternoon')) return t('risk.reasoning.worseningAfternoon') || item;
  if (item.includes('Critical marine safety data')) return t('risk.reasoning.missingWaveHeight') || item;
  if (item.includes('Dangerous general wind or wave conditions')) return t('risk.reasoning.dangerousWindWaves') || item;
  if (item.includes('Moderate wind/waves')) return t('risk.reasoning.moderateWindWaves') || item;
  if (item.includes('No active marine alerts')) return t('risk.reasoning.noAlerts') || item;
  return item;
};

export default function RecommendationCard({ rec }: RecommendationCardProps) {
  const [showEvidence, setShowEvidence] = useState(false)
  const { t } = useTranslation()
  const cls = levelClass[rec.level]

  return (
    <div className={`rec-card ${cls}`}>
      {/* Mock data notice */}
      {rec.isMockData && (
        <div style={{
          fontSize: 10.5, color: 'rgba(251,191,36,0.65)',
          marginBottom: 10, display: 'flex', alignItems: 'center', gap: 4
        }}>
          {t('risk.demoNotice')}
        </div>
      )}

      {/* Status badge */}
      <div className={`rec-status-badge ${cls}`}>
        {getLevelLabel(rec.level, t)}
      </div>

      {/* Summary */}
      {rec.summary && (
        <div className="rec-summary markdown-body">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {rec.summary}
          </ReactMarkdown>
        </div>
      )}

      {/* Return time window */}
      {rec.returnWindow && (
        <div className="rec-return-time">
          <Clock size={14} style={{ color: 'rgba(126,200,227,0.7)', flexShrink: 0 }} />
          <div>
            <span style={{ color: 'rgba(126,200,227,0.6)', fontSize: 11 }}>{t('risk.depart')} </span>
            <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{rec.returnWindow.departureTime}</span>
            <span style={{ margin: '0 6px', color: 'rgba(255,255,255,0.2)' }}>·</span>
            <span style={{ color: 'rgba(126,200,227,0.6)', fontSize: 11 }}>{t('risk.returnBy')} </span>
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
            {t('risk.reasoning')}
          </div>
          {rec.reasoning.map((r, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, fontSize: 13, color: 'rgba(184,223,240,0.8)', marginBottom: 5 }}>
              <span style={{ color: 'rgba(126,200,227,0.5)', flexShrink: 0 }}>•</span>
              {translateReasoningItem(r, t)}
            </div>
          ))}
        </div>
      )}

      {/* Data freshness */}
      <div className="data-freshness">
        <div style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'rgba(126,200,227,0.4)', marginBottom: 4 }}>
          {t('risk.dataFreshness')}
        </div>
        <div className="freshness-row">
          <span className="freshness-label">{t('data.weather')}</span>
          <span className="freshness-value">{rec.dataFreshness.weather}</span>
        </div>
        <div className="freshness-row">
          <span className="freshness-label">{t('data.marine')}</span>
          <span className="freshness-value">{rec.dataFreshness.marine}</span>
        </div>
        <div className="freshness-row">
          <span className="freshness-label">{t('data.satellite')}</span>
          <span className="freshness-value">{rec.dataFreshness.satellite}</span>
        </div>
        <div className="freshness-row" style={{ marginTop: 4 }}>
          <span className="freshness-label" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Shield size={10} /> {t('risk.confidence')}
          </span>
          <span style={{ fontWeight: 600, fontSize: 12, color: confidenceColor[rec.confidence] }}>
            {t(`risk.${rec.confidence.toLowerCase()}` as any) || rec.confidence}
          </span>
        </div>
      </div>

      {/* Evidence toggle */}
      <button className="evidence-btn" onClick={() => setShowEvidence(!showEvidence)}>
        {showEvidence ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        {showEvidence ? t('risk.hideDetails') : t('risk.viewEvidence')}
      </button>
    </div>
  )
}
