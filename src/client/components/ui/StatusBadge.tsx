import type React from 'react'
import { useTranslation } from '../../locales'

export type ProviderStatusValue = 'REAL_DATA_SUCCESS' | 'REAL_DATA_EMPTY' | 'PROVIDER_UNAVAILABLE' | 'MOCK_DATA' | string

interface StatusBadgeProps {
  status: ProviderStatusValue
  title?: string
  style?: React.CSSProperties
}

const STATUS_CONFIG: Record<string, { labelKey: string; color: string; bg: string; border: string }> = {
  REAL_DATA_SUCCESS: { labelKey: 'data.realData', color: '#34d399', bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.35)' },
  REAL_DATA_EMPTY: { labelKey: 'data.noData', color: '#fbbf24', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.35)' },
  PROVIDER_UNAVAILABLE: { labelKey: 'data.unavailable', color: '#f87171', bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.35)' },
  MOCK_DATA: { labelKey: 'data.demoData', color: 'rgba(148,163,184,0.9)', bg: 'rgba(100,116,139,0.12)', border: 'rgba(100,116,139,0.3)' },
}

const FALLBACK_CONFIG = { labelKey: 'data.unknown', color: 'rgba(148,163,184,0.7)', bg: 'rgba(100,116,139,0.08)', border: 'rgba(100,116,139,0.2)' }

export default function StatusBadge({ status, title, style }: StatusBadgeProps) {
  const { t } = useTranslation()
  const cfg = STATUS_CONFIG[status] ?? FALLBACK_CONFIG
  return (
    <span
      title={title ?? status}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        fontSize: 10.5, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
        padding: '2px 8px', borderRadius: 99, color: cfg.color, background: cfg.bg,
        border: '1px solid ' + cfg.border, whiteSpace: 'nowrap', ...style,
      }}
    >
      {t(cfg.labelKey as any) || cfg.labelKey}
    </span>
  )
}
