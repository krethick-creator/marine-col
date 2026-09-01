import { useEffect, useState } from 'react'
import { CheckCircle, Loader, Circle } from 'lucide-react'
import type { AgentTraceStep } from '../../types'
import { useTranslation } from '../../locales'

interface AgentTraceProps {
  steps: AgentTraceStep[]
  currentIndex: number
}

const agentEmojis: Record<string, string> = {
  planner:    '🧠',
  weather:    '🌤',
  ocean:      '🌊',
  satellite:  '🛰',
  geospatial: '🗺',
  risk:       '⚖️',
  route:      '🧭',
  alert:      '🔔',
  synthesis:  '✨',
  data:       '📡',
}

export default function AgentTrace({ steps, currentIndex }: AgentTraceProps) {
  const [visibleCount, setVisibleCount] = useState(0)
  const { t } = useTranslation()

  useEffect(() => {
    // Animate steps appearing one by one
    if (visibleCount < steps.length) {
      const t = setTimeout(() => setVisibleCount((v) => v + 1), 120)
      return () => clearTimeout(t)
    }
  }, [visibleCount, steps.length])

  const getAgentName = (step: AgentTraceStep) => {
    const key = `agents.${step.agentId}` as any
    const translated = t(key)
    return translated !== key ? translated : step.agentName
  }

  return (
    <div className="agent-trace">
      <div className="agent-trace-title">🔍 {t('chat.analysing')}</div>
      {steps.slice(0, visibleCount).map((step, idx) => {
        const status =
          idx < currentIndex ? 'done'
          : idx === currentIndex ? 'active'
          : 'pending'

        const emoji = agentEmojis[step.agentId] ?? '🤖'

        return (
          <div key={step.agentId}>
            <div className={`agent-step ${status}`}>
              <div className="agent-step-icon">
                {status === 'done'   && <CheckCircle size={12} color="var(--status-go)" />}
                {status === 'active' && <Loader size={12} style={{ animation: 'spin 1s linear infinite' }} />}
                {status === 'pending'&& <Circle size={10} style={{ opacity: 0.3 }} />}
              </div>
              <span style={{ fontSize: 12 }}>{emoji}</span>
              <span>{getAgentName(step)}</span>
              {status === 'active' && (
                <span style={{ marginLeft: 'auto', fontSize: 11, color: 'rgba(126,200,227,0.5)' }}>
                  {t('chat.working')}
                </span>
              )}
              {status === 'done' && (
                <span style={{ marginLeft: 'auto', fontSize: 10, color: 'rgba(34,197,94,0.5)' }}>
                  ✓
                </span>
              )}
            </div>
            {idx < steps.length - 1 && (
              <div className="agent-connector" style={{ marginLeft: 21 }} />
            )}
          </div>
        )
      })}
    </div>
  )
}
