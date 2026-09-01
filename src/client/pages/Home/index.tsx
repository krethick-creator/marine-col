import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Plus, Mic, Send, Image as ImageIcon, Calendar, Waves, Satellite, Fish, AlertTriangle, MapPin } from 'lucide-react'
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
import { useAuthStore } from '../../store/authStore'
import type { ChatMessage, AgentTraceStep } from '../../types'
import { useTranslation } from '../../locales'
import { mapRoleToCanonicalRole, ROLE_CONFIGS } from '../../config/roleConfig'

// ─── Simulated agent processing delay ─────────────────────────────────
const AGENT_STEP_DELAY_MS = 600

export default function HomePage() {
  const navigate = useNavigate()
  const { messages, addMessage, updateMessage, isLoading, setLoading, setAgentIndex } = useChatStore()
  const [input, setInput] = useState('')
  const [agentSteps, setAgentSteps] = useState<AgentTraceStep[]>([])
  const [localAgentIndex, setLocalAgentIndex] = useState(-1)
  const [plusMenuOpen, setPlusMenuOpen] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [speechError, setSpeechError] = useState<string | null>(null)
  
  const { t } = useTranslation()
  const locationState = useLocation()
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const plusMenuRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const recognitionRef = useRef<any>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  
  const hasMessages = messages.length > 0
  const { user: authUser } = useAuthStore()
  const { user } = useAppStore()
  const rawRole = authUser?.role || (user as any)?.role
  const canonicalRole = mapRoleToCanonicalRole(rawRole)
  const roleConfig = ROLE_CONFIGS[canonicalRole]

  const startMediaRecorder = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data)
        }
      }

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(track => track.stop())
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        if (audioBlob.size < 500) {
          setIsListening(false)
          return
        }

        setIsTranscribing(true)
        const reader = new FileReader()
        reader.readAsDataURL(audioBlob)
        reader.onloadend = async () => {
          const base64Audio = reader.result as string
          try {
            const res = await fetch('/api/chat/transcribe', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ audio: base64Audio, language: user?.language || 'en' }),
            })
            const data = await res.json()
            if (data.ok && data.text) {
              setInput(data.text)
              if (textareaRef.current) {
                textareaRef.current.style.height = 'auto'
                textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 160) + 'px'
              }
            } else {
              setSpeechError('Failed to transcribe audio. Please try again.')
              setTimeout(() => setSpeechError(null), 4000)
            }
          } catch (err) {
            setSpeechError('Network error transcribing audio.')
            setTimeout(() => setSpeechError(null), 4000)
          } finally {
            setIsTranscribing(false)
            setIsListening(false)
          }
        }
      }

      mediaRecorder.start()
      setIsListening(true)
      setSpeechError(null)
    } catch (err: any) {
      console.error('MediaRecorder error:', err)
      setSpeechError('Microphone access denied or unavailable.')
      setIsListening(false)
      setTimeout(() => setSpeechError(null), 4000)
    }
  }

  const toggleSpeechRecognition = useCallback(() => {
    if (isListening) {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop()
      } else if (recognitionRef.current) {
        try { recognitionRef.current.stop() } catch (e) {}
      }
      setIsListening(false)
      return
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) {
      startMediaRecorder()
      return
    }

    try {
      const recognition = new SpeechRecognition()
      recognition.continuous = false
      recognition.interimResults = true

      const langMap: Record<string, string> = {
        en: 'en-IN',
        ta: 'ta-IN',
        hi: 'hi-IN',
        te: 'te-IN',
        ml: 'ml-IN',
        kn: 'kn-IN',
      }
      recognition.lang = langMap[user?.language || 'en'] || 'en-IN'

      recognition.onstart = () => {
        setIsListening(true)
        setSpeechError(null)
      }

      recognition.onresult = (event: any) => {
        let currentTranscript = ''
        for (let i = event.resultIndex; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript
        }
        if (currentTranscript.trim()) {
          setInput(currentTranscript)
          if (textareaRef.current) {
            textareaRef.current.style.height = 'auto'
            textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 160) + 'px'
          }
        }
      }

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error, trying MediaRecorder fallback:', event.error)
        if (event.error === 'network' || event.error === 'service-not-allowed' || event.error === 'not-allowed') {
          // Seamless fallback to browser MediaRecorder + Groq Whisper
          startMediaRecorder()
        } else if (event.error !== 'no-speech' && event.error !== 'aborted') {
          setSpeechError(`Speech error: ${event.error}`)
          setIsListening(false)
          setTimeout(() => setSpeechError(null), 4000)
        } else {
          setIsListening(false)
        }
      }

      recognition.onend = () => {
        if (!mediaRecorderRef.current || mediaRecorderRef.current.state !== 'recording') {
          setIsListening(false)
        }
      }

      recognitionRef.current = recognition
      recognition.start()
    } catch (err: any) {
      console.warn('SpeechRecognition failed to start, using MediaRecorder fallback:', err)
      startMediaRecorder()
    }
  }, [isListening, user?.language])

  const translateSeaState = (seaState: string | undefined): string => {
    if (!seaState) return t('data.unknown')
    const key = `seaState.${seaState.toLowerCase().replace(/\s+/g, '')}` as any
    const translated = t(key)
    return translated !== key ? translated : seaState
  }

  // ─── Map provider status codes to localized display strings ───────
  const translateProviderStatus = (status: string | undefined): string => {
    if (!status) return t('data.unknown')
    if (status === 'REAL_DATA_SUCCESS') return t('data.justNow')
    if (status === 'MOCK_DATA') return t('data.mockData')
    if (status === 'PROVIDER_UNAVAILABLE') return t('data.providerUnavailable')
    if (status === 'NOT_CONFIGURED') return t('data.notConfigured')
    if (status === 'REAL_DATA_EMPTY') return t('data.noData')
    return status
  }

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
      isMockData: false,
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
      (finalResponse: any, riskAssessment: any, routePlan: any, providerStatuses: any) => {
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
              { label: t('evidence.windSpeed'), value: riskAssessment.evidence?.windSpeed ? `${riskAssessment.evidence.windSpeed} km/h` : t('data.unknown'), icon: '💨' },
              { label: t('evidence.waveHeight'), value: riskAssessment.evidence?.waveHeight !== null && riskAssessment.evidence?.waveHeight !== undefined ? `${riskAssessment.evidence.waveHeight} m` : t('data.unavailable'), icon: '🌊' },
              ...(riskAssessment.evidence?.seaState ? [{ label: t('evidence.seaState'), value: translateSeaState(riskAssessment.evidence.seaState), icon: '⛵' }] : []),
              ...(riskAssessment.evidence?.swellPeriod ? [{ label: t('evidence.swellPeriod'), value: `${riskAssessment.evidence.swellPeriod} s`, icon: '⏱️' }] : []),
              ...(riskAssessment.evidence?.currentSpeed !== null && riskAssessment.evidence?.currentSpeed !== undefined ? [{ label: t('evidence.currentSpeed'), value: `${riskAssessment.evidence.currentSpeed} km/h`, icon: '🧭' }] : []),
            ],
            dataFreshness: {
              weather: translateProviderStatus(providerStatuses?.weather?.status),
              marine: translateProviderStatus(providerStatuses?.ocean?.status),
              satellite: translateProviderStatus(providerStatuses?.satellite?.status),
              updatedAt: new Date()
            },
            isMockData: Object.values(providerStatuses || {}).some((p: any) => p.status === 'MOCK_DATA')
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
      (err: any) => {
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

  // Close plus menu on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (plusMenuRef.current && !plusMenuRef.current.contains(e.target as Node)) {
        setPlusMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Handle query passed via navigate state from Dashboard
  useEffect(() => {
    const initialQuery = (locationState.state as any)?.initialQuery
    if (initialQuery && typeof initialQuery === 'string' && !isLoading) {
      addMessage({
        id: `user-${Date.now()}`,
        role: 'user',
        content: initialQuery,
        timestamp: new Date(),
      })
      setLoading(true)
      simulateAgents(initialQuery)
    }
  }, [locationState.state])

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
        {!hasMessages && (
          <div style={{ maxWidth: 640, width: '100%', margin: '0 auto 20px auto', textAlign: 'center' }}>
            <div style={{ fontSize: 13, color: 'var(--text-light)', marginBottom: 12, fontWeight: 500 }}>
              Suggested for <span style={{ color: roleConfig.badgeColor, fontWeight: 700 }}>{t(roleConfig.displayNameKey as any) || canonicalRole.toUpperCase()}</span>:
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
              {roleConfig.quickActions.map((qa) => (
                <button
                  key={qa.id}
                  className="glass"
                  onClick={() => {
                    addMessage({
                      id: `user-${Date.now()}`,
                      role: 'user',
                      content: qa.query,
                      timestamp: new Date(),
                    })
                    setLoading(true)
                    simulateAgents(qa.query)
                  }}
                  style={{
                    padding: '8px 14px',
                    borderRadius: 99,
                    fontSize: 12.5,
                    fontWeight: 500,
                    color: 'var(--text-main)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    cursor: 'pointer',
                    background: 'rgba(255,255,255,0.04)',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {qa.query}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="chat-input-wrapper" style={{ position: 'relative' }}>
          {/* Plus Quick Action Popup Menu */}
          {plusMenuOpen && (
            <div
              ref={plusMenuRef}
              style={{
                position: 'absolute',
                bottom: 'calc(100% + 12px)',
                left: 0,
                width: 230,
                background: 'rgba(10, 20, 30, 0.92)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                border: '1px solid rgba(45, 139, 186, 0.3)',
                borderRadius: 14,
                padding: '8px',
                boxShadow: '0 12px 32px rgba(0, 0, 0, 0.6)',
                zIndex: 100,
                display: 'flex',
                flexDirection: 'column',
                gap: '2px',
                animation: 'fadeInUp 0.2s ease-out'
              }}
            >
              <button
                type="button"
                onClick={() => {
                  setPlusMenuOpen(false)
                  fileInputRef.current?.click()
                }}
                className="plus-menu-item"
              >
                <ImageIcon size={18} color="#3a86ff" />
                <span>Add Image</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setPlusMenuOpen(false)
                  navigate('/planner')
                }}
                className="plus-menu-item"
              >
                <Calendar size={18} color="#2ecc71" />
                <span>Plan Trip</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setPlusMenuOpen(false)
                  navigate('/weather')
                }}
                className="plus-menu-item"
              >
                <Waves size={18} color="#00b4d8" />
                <span>Weather & Ocean</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setPlusMenuOpen(false)
                  navigate('/climate')
                }}
                className="plus-menu-item"
              >
                <Satellite size={18} color="#9d4edd" />
                <span>Satellite Information</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setPlusMenuOpen(false)
                  navigate('/fishing')
                }}
                className="plus-menu-item"
              >
                <Fish size={18} color="#ffb703" />
                <span>Fishing Zones</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setPlusMenuOpen(false)
                  navigate('/alerts')
                }}
                className="plus-menu-item"
              >
                <AlertTriangle size={18} color="#ff3b30" />
                <span>Alerts & Warnings</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setPlusMenuOpen(false)
                  useAppStore.getState().setShowLocationModal(true)
                }}
                className="plus-menu-item"
              >
                <MapPin size={18} color="#ef4444" />
                <span>Location</span>
              </button>
            </div>
          )}

          <input
            type="file"
            ref={fileInputRef}
            style={{ display: 'none' }}
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) {
                setInput((prev) => (prev ? `${prev} [Attached image: ${file.name}]` : `[Attached image: ${file.name}]`))
              }
            }}
          />

          <button 
            type="button"
            className="input-plus-btn" 
            aria-label={t('chat.attach')} 
            title={t('chat.attach')}
            onClick={() => setPlusMenuOpen(!plusMenuOpen)}
          >
            <Plus size={22} style={{ transform: plusMenuOpen ? 'rotate(45deg)' : 'none', transition: 'transform 0.2s ease' }} />
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

          {/* Speech Error Banner */}
          {speechError && (
            <div 
              onClick={() => setSpeechError(null)}
              style={{
                position: 'absolute',
                bottom: 'calc(100% + 8px)',
                right: 16,
                background: 'rgba(239, 68, 68, 0.92)',
                color: '#fff',
                fontSize: 12,
                padding: '6px 12px',
                borderRadius: 8,
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                zIndex: 100,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                cursor: 'pointer'
              }}
            >
              <span>{speechError}</span>
              <span style={{ fontSize: 14, fontWeight: 'bold', opacity: 0.8 }}>✕</span>
            </div>
          )}

          {/* Listening / Transcribing Indicator Badge */}
          {(isListening || isTranscribing) && (
            <div style={{
              position: 'absolute',
              top: -32,
              right: 16,
              background: isTranscribing ? 'rgba(45, 139, 186, 0.9)' : 'rgba(239, 68, 68, 0.9)',
              color: '#ffffff',
              fontSize: 11,
              fontWeight: 600,
              padding: '4px 12px',
              borderRadius: 12,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
              zIndex: 10
            }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#fff', animation: 'ping 1s infinite' }} />
              {isTranscribing 
                ? 'Transcribing voice...' 
                : `Recording (${user?.language?.toUpperCase() || 'EN'})...`}
            </div>
          )}

          <div className="chat-input-actions">
            <button 
              type="button"
              className="input-action-btn" 
              aria-label={t('chat.voice') || 'Voice Input'} 
              title={isListening ? 'Stop Listening' : (t('chat.voice') || 'Voice Input')}
              onClick={toggleSpeechRecognition}
              style={{
                background: isListening ? 'rgba(239, 68, 68, 0.25)' : undefined,
                color: isListening ? '#ef4444' : undefined,
                border: isListening ? '1px solid rgba(239, 68, 68, 0.5)' : undefined,
                boxShadow: isListening ? '0 0 12px rgba(239, 68, 68, 0.5)' : undefined,
                animation: isListening ? 'micPulse 1.5s infinite' : undefined,
              }}
            >
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
