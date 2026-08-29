import { useState, useRef, useEffect, useCallback } from 'react'
import { Plus, Mic, Brain, Send } from 'lucide-react'
import AgentTrace from '../../components/chat/AgentTrace'
import RecommendationCard from '../../components/chat/RecommendationCard'
import {
  mockAgentSteps,
  getMockResponseForQuery,
} from '../../services/mockProviders/mockData'
import { useChatStore } from '../../store'
import type { ChatMessage, AgentTraceStep } from '../../types'

// ─── Suggestion chips ─────────────────────────────────────────────────
const suggestions = [
  'Is it safe to go fishing tomorrow?',
  'Find the nearest fishing zone.',
  'Plan a 3-day fishing trip.',
  'Show dangerous zones near me.',
  'What are the wave conditions tomorrow morning?',
  'Check boundary safety for my route.',
]

// ─── Simulated agent processing delay ─────────────────────────────────
const AGENT_STEP_DELAY_MS = 600

export default function HomePage() {
  const { messages, addMessage, isLoading, setLoading, setAgentIndex } = useChatStore()
  const [input, setInput] = useState('')
  const [agentSteps, setAgentSteps] = useState<AgentTraceStep[]>([])
  const [localAgentIndex, setLocalAgentIndex] = useState(-1)

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

  // ─── Simulate multi-agent processing ──────────────────────────────
  const simulateAgents = useCallback(async (query: string) => {
    const steps: AgentTraceStep[] = mockAgentSteps.map((s) => ({
      ...s,
      status: 'pending' as const,
    }))
    setAgentSteps(steps)
    setLocalAgentIndex(0)

    const traceId = `trace-${Date.now()}`
    addMessage({
      id: traceId,
      role: 'assistant',
      content: '__AGENT_TRACE__',
      timestamp: new Date(),
      agentTrace: steps,
    })

    for (let i = 0; i < steps.length; i++) {
      setLocalAgentIndex(i)
      setAgentIndex(i)
      await new Promise((r) => setTimeout(r, AGENT_STEP_DELAY_MS))
    }

    setLocalAgentIndex(steps.length)
    setAgentIndex(steps.length)

    const { recommendation, answer } = getMockResponseForQuery(query)

    addMessage({
      id: `ans-${Date.now()}`,
      role: 'assistant',
      content: answer,
      timestamp: new Date(),
      recommendation,
      isMockData: true,
    })

    setLoading(false)
    setLocalAgentIndex(-1)
    setAgentIndex(-1)
    setAgentSteps([])
  }, [addMessage, setLoading, setAgentIndex])

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
          <button className="input-plus-btn" aria-label="Attach file" title="Attach file">
            <Plus size={22} />
          </button>

          <textarea
            ref={textareaRef}
            className="chat-textarea"
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Ask ORCA anything..."
            rows={1}
            disabled={isLoading}
          />

          <div className="chat-input-actions">
            <button className="input-action-btn" aria-label="Reasoning Agent" title="Reasoning">
              <Brain size={18} />
            </button>
            <button className="input-action-btn" aria-label="Voice input" title="Voice input">
              <Mic size={18} />
            </button>
            <button
              className="send-btn"
              onClick={handleSubmit}
              disabled={!input.trim() || isLoading}
              aria-label="Send message"
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
      </div>

      {msg.recommendation && (
        <div style={{ marginTop: 8, width: '100%', maxWidth: 560 }}>
          <RecommendationCard rec={msg.recommendation} />
        </div>
      )}

      <div style={{ fontSize: 10.5, color: 'var(--text-light)', paddingLeft: 4, marginTop: 2 }}>
        {msg.timestamp.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
        {msg.isMockData && ' · DEMO'}
      </div>
    </div>
  )
}

function MessageContent({ content }: { content: string }) {
  const parts = content.split(/\*\*(.*?)\*\*/g)
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1
          ? <strong key={i} style={{ color: 'inherit', fontWeight: 700 }}>{part}</strong>
          : <span key={i}>{part}</span>
      )}
    </>
  )
}
