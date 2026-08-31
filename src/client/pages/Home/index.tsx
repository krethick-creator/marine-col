import { useState, useRef, useEffect, useCallback } from 'react'
import { Plus, Mic, Brain, Send } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import AgentTrace from '../../components/chat/AgentTrace'
import RecommendationCard from '../../components/chat/RecommendationCard'
import ChatRouteMap from '../../components/chat/ChatRouteMap'
import {
  mockAgentSteps,
  getMockResponseForQuery,
} from '../../services/mockProviders/mockData'
import { useChatStore, useAppStore } from '../../store'
import type { ChatMessage, AgentTraceStep } from '../../types'
import { useTranslation } from '../../locales'

// ─── Simulated agent processing delay ─────────────────────────────────
const AGENT_STEP_DELAY_MS = 600

export default function HomePage() {
  const { messages, addMessage, updateMessage, isLoading, setLoading, setAgentIndex } = useChatStore()
  const [input, setInput] = useState('')
  const [agentSteps, setAgentSteps] = useState<AgentTraceStep[]>([])
  const [localAgentIndex, setLocalAgentIndex] = useState(-1)
  const { t } = useTranslation()

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const hasMessages = messages.length > 0

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, localAgentIndex])

  // Auto-resize textarea
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
    const ta = textareaRef.current
    if (ta) {
      ta.style.height = 'auto'
      ta.style.height = Math.min(ta.scrollHeight, 160) + 'px'
    }
  }

  const { user } = useAppStore() // Assuming this is where location is stored

  // --- Real agent processing ---
  const simulateAgents = useCallback(async (query: string) => {
    // 1. Initial UI setup (trace placeholder)
    const traceId = `trace-${Date.now()}`
    
    // We start with our agent list from mockAgentSteps just to have labels,
    // but we will mark them as pending/active as the stream goes.
    const steps: AgentTraceStep[] = mockAgentSteps.map((s) => ({
      ...s,
      status: 'pending' as const,
    }))
    
    setAgentSteps(steps)
    setLocalAgentIndex(0)
    setAgentIndex(0)

    addMessage({
      id: traceId,
      role: 'assistant',
      content: '__AGENT_TRACE__',
      timestamp: new Date(),
      agentTrace: steps,
    })

    // 2. Map backend nodes to UI agent indices
    const nodeMap: Record<string, number> = {
      'plannerAgent': 0,
      'dataDiscoveryAgent': 1,
      'agentRouterNode': 1,
      'weatherAgent': 2,
      'oceanAgent': 3,
      'geospatialAgent': 3,
      'alertAgent': 4,
      'satelliteAgent': 4,
      'riskAgent': 5,
      'routeAgent': 6,
      'synthesisAgent': 7,
    };

    let latestIndex = 0;

    const { streamChat } = await import('../../services/api/chatService');
    
    streamChat(
      query,
      user?.location ? { ...user.location, locationName: user.locationName } : undefined,
      user?.language || 'en',
      (nodeName, executedSteps) => {
        // Find which step this corresponds to
        let targetIndex = nodeMap[nodeName];
        if (targetIndex !== undefined) {
          if (targetIndex < latestIndex) targetIndex = latestIndex;
          latestIndex = targetIndex;
          setLocalAgentIndex(targetIndex);
          setAgentIndex(targetIndex);
        }
      },
      (finalResponse, riskAssessment, routePlan, providerStatuses) => {
        setLocalAgentIndex(steps.length);
        setAgentIndex(steps.length);
        
        let formattedRecommendation = undefined;
        
        if (riskAssessment) {
          // riskAgent now returns { level, reasoning, evidence }
          const riskLevel = riskAssessment.level ?? riskAssessment.status ?? 'CAUTION';
          formattedRecommendation = {
            level: riskLevel, // GO, CAUTION, NO_GO
            confidence: 'HIGH' as const,
            summary: riskAssessment.summary || '',
            reasoning: riskAssessment.reasoning || [],
            evidence: [
              { label: 'Wind Speed', value: riskAssessment.evidence?.windSpeed ? `${riskAssessment.evidence.windSpeed} km/h` : 'Unknown', icon: '💨' },
              { label: 'Wave Height', value: riskAssessment.evidence?.waveHeight !== null && riskAssessment.evidence?.waveHeight !== undefined ? `${riskAssessment.evidence.waveHeight} m` : 'Unavailable', icon: '🌊' },
              ...(riskAssessment.evidence?.seaState ? [{ label: 'Sea State', value: riskAssessment.evidence.seaState, icon: '⛵' }] : []),
              ...(riskAssessment.evidence?.swellPeriod ? [{ label: 'Swell Period', value: `${riskAssessment.evidence.swellPeriod} s`, icon: '⏱️' }] : []),
              ...(riskAssessment.evidence?.currentSpeed !== null && riskAssessment.evidence?.currentSpeed !== undefined ? [{ label: 'Current Speed', value: `${riskAssessment.evidence.currentSpeed} km/h`, icon: '🧭' }] : []),
            ],
            dataFreshness: {
              weather: providerStatuses?.weather?.status === 'REAL_DATA_SUCCESS' ? 'Just now' : providerStatuses?.weather?.status ?? 'Unknown',
              marine: providerStatuses?.ocean?.status === 'REAL_DATA_SUCCESS' ? 'Just now' : providerStatuses?.ocean?.status ?? 'Unknown',
              satellite: providerStatuses?.satellite?.status === 'REAL_DATA_SUCCESS' ? 'Just now' : providerStatuses?.satellite?.status ?? 'Unknown',
              updatedAt: new Date()
            },
            isMockData: Object.values(providerStatuses || {}).some((p) => p.status === 'MOCK_DATA')
          }
        }

        updateMessage(traceId, {
          content: finalResponse,
          recommendation: formattedRecommendation,
          routePlan: routePlan && routePlan.success && routePlan.waypoints?.length > 0 ? routePlan : undefined,
          isMockData: false,
        });

        setLoading(false);
        setLocalAgentIndex(-1);
        setAgentIndex(-1);
        setAgentSteps([]);
      },
      (err) => {
        updateMessage(traceId, {
          content: `Sorry, I encountered an error: ${err}`,
          isMockData: false,
        });
        setLoading(false);
        setLocalAgentIndex(-1);
        setAgentIndex(-1);
        setAgentSteps([]);
      }
    )
  }, [addMessage, updateMessage, setLoading, setAgentIndex, user?.location])

  // ─── Submit handler ────────────────────────────────────────────────
  const handleSubmit = useCallback(async () => {
    const q = input.trim()
    if (!q || isLoading) return

    addMessage({
      id: `user-${Date.now()}`,
      role: 'user',
      content: q,
      timestamp: new Date(),
    })

    setInput('')
    if (textareaRef.current) {
      textareaRef.current.style.height = '46px' // reset to base height
    }
    setLoading(true)

    await new Promise((r) => setTimeout(r, 300))
    simulateAgents(q)
  }, [input, isLoading, addMessage, setLoading, simulateAgents])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const handleSuggestion = (s: string) => {
    setInput(s)
    textareaRef.current?.focus()
  }

  return (
    <div className={`chat-page ${!hasMessages ? 'chat-page-empty' : ''}`}>
      {hasMessages && (
        <div className="chat-messages">
          {messages.map((msg) => (
            <MessageGroup key={msg.id} msg={msg} agentSteps={agentSteps} localAgentIndex={localAgentIndex} />
          ))}
          <div ref={messagesEndRef} />
        </div>
      )}

      <div className={`chat-input-area ${!hasMessages ? 'centered-input' : ''}`}>
        <div className="chat-input-wrapper">
          <button className="input-plus-btn" aria-label={t('chat.attach')} title={t('chat.attach')}>
            <Plus size={22} />
          </button>

          <textarea
            ref={textareaRef}
            className="chat-textarea"
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={t('chat.placeholder')}
            rows={1}
            disabled={isLoading}
          />

          <div className="chat-input-actions">
            <button className="input-action-btn" aria-label={t('chat.reasoning')} title={t('chat.reasoning')}>
              <Brain size={18} />
            </button>
            <button className="input-action-btn" aria-label={t('chat.voice')} title={t('chat.voice')}>
              <Mic size={18} />
            </button>
            <button
              className="send-btn"
              onClick={handleSubmit}
              disabled={!input.trim() || isLoading}
              aria-label={t('chat.send')}
            >
              {isLoading
                ? <div style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                : <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5v14M22 10v4M7 5v14M2 10v4"/></svg>
              }
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function MessageGroup({
  msg,
  agentSteps,
  localAgentIndex,
}: {
  msg: ChatMessage
  agentSteps: AgentTraceStep[]
  localAgentIndex: number
}) {
  if (msg.content === '__AGENT_TRACE__') {
    return (
      <div className="message-group assistant">
        <AgentTrace steps={agentSteps} currentIndex={localAgentIndex} />
      </div>
    )
  }

  return (
    <div className={`message-group ${msg.role}`}>
      {msg.role === 'assistant' && (
        <div style={{ fontSize: 11, color: 'var(--text-light)', marginBottom: 4, paddingLeft: 4, fontWeight: 600 }}>
          ORCA
        </div>
      )}

      <div className={`message-bubble ${msg.role}`}>
        <MessageContent content={msg.content} />
        {msg.recommendation && (
          <div style={{ marginTop: 16, borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 16, width: '100%', maxWidth: 560 }}>
            <RecommendationCard rec={msg.recommendation} />
          </div>
        )}
        {msg.routePlan && (
          <div style={{ marginTop: 12, width: '100%', maxWidth: 560 }}>
            <ChatRouteMap routePlan={msg.routePlan} />
          </div>
        )}
      </div>

      <div style={{ fontSize: 10.5, color: 'var(--text-light)', paddingLeft: 4, marginTop: 2 }}>
        {msg.timestamp.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
        {msg.isMockData && ' · DEMO'}
      </div>
    </div>
  )
}

function MessageContent({ content }: { content: string }) {
  if (content === '__AGENT_TRACE__') return null
  
  return (
    <div className="markdown-body">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {content}
      </ReactMarkdown>
    </div>
  )
}
