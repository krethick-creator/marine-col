import { useState } from 'react'
import { AlertTriangle, Phone, MapPin, CheckSquare, Square } from 'lucide-react'

const checklist = [
  'Life jackets for all crew members',
  'VHF radio charged and operational',
  'Emergency flares onboard',
  'First aid kit complete',
  'Trip registered with harbour master',
  'Emergency contacts informed of departure',
  'Fuel sufficient for return journey',
  'Weather checked — no active warnings',
]

export default function SOSPage() {
  const [checked, setChecked] = useState<boolean[]>(checklist.map(() => false))
  const [sosStep, setSosStep] = useState<'idle' | 'confirm' | 'sent'>('idle')

  const toggleCheck = (i: number) => {
    setChecked((prev) => prev.map((v, idx) => (idx === i ? !v : v)))
  }

  return (
    <div className="page-shell">
      <div className="page-header">
        <div>
          <h1 className="page-title">SOS & Safety</h1>
          <p className="page-subtitle">Emergency assistance and pre-departure safety checklist</p>
        </div>
      </div>

      {/* SOS Button */}
      <div className="glass-card" style={{ padding: 28, textAlign: 'center', background: 'rgba(239,68,68,0.06)', borderColor: 'rgba(239,68,68,0.2)' }}>
        {sosStep === 'idle' && (
          <>
            <div style={{ fontSize: 13, color: 'rgba(184,223,240,0.5)', marginBottom: 16 }}>
              Only activate in a genuine life-threatening emergency at sea.
            </div>
            <button
              id="sos-trigger-btn"
              onClick={() => setSosStep('confirm')}
              style={{
                padding: '14px 40px', borderRadius: 16,
                background: 'rgba(239,68,68,0.15)', border: '2px solid rgba(239,68,68,0.5)',
                color: '#f87171', fontSize: 18, fontWeight: 800, letterSpacing: '0.1em',
                cursor: 'pointer', transition: 'all 0.2s',
              }}
            >
              🆘 SEND SOS
            </button>
          </>
        )}
        {sosStep === 'confirm' && (
          <>
            <div style={{ color: '#f87171', fontWeight: 700, fontSize: 16, marginBottom: 10 }}>⚠️ Confirm Emergency</div>
            <div style={{ fontSize: 13, color: 'rgba(184,223,240,0.6)', marginBottom: 20 }}>
              This will transmit your GPS coordinates to emergency services. Are you sure?
            </div>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button onClick={() => setSosStep('idle')} style={{ padding: '10px 24px', borderRadius: 10, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(184,223,240,0.7)', cursor: 'pointer', fontSize: 13 }}>
                Cancel
              </button>
              <button id="sos-confirm-btn" onClick={() => setSosStep('sent')} style={{ padding: '10px 24px', borderRadius: 10, background: 'rgba(239,68,68,0.3)', border: '1px solid rgba(239,68,68,0.5)', color: '#f87171', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>
                Confirm SOS
              </button>
            </div>
          </>
        )}
        {sosStep === 'sent' && (
          <div>
            <div style={{ fontSize: 32, marginBottom: 10 }}>📡</div>
            <div style={{ color: '#4ade80', fontWeight: 700, fontSize: 16, marginBottom: 6 }}>SOS Signal Transmitted</div>
            <div style={{ fontSize: 13, color: 'rgba(184,223,240,0.5)', marginBottom: 12 }}>
              [DEMO MODE — No real signal sent. In production, emergency services would be notified.]
            </div>
            <div style={{ fontSize: 12, color: 'rgba(126,200,227,0.5)' }}>📍 Location: 13.0827°N 80.2707°E · {new Date().toLocaleTimeString()}</div>
          </div>
        )}
      </div>

      {/* Emergency contacts */}
      <div className="glass-card" style={{ padding: 20 }}>
        <div style={{ fontFamily: 'Outfit,sans-serif', fontSize: 16, fontWeight: 700, color: 'var(--text-main)', marginBottom: 14 }}>Emergency Contacts</div>
        {[
          { label: 'Coast Guard', number: '1554' },
          { label: 'Marine Rescue', number: '1800-180-1407' },
          { label: 'IMD Alert Line', number: '1800-180-1717' },
        ].map((c) => (
          <div key={c.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <span style={{ fontSize: 13, color: 'rgba(184,223,240,0.7)' }}>{c.label}</span>
            <a href={`tel:${c.number}`} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: var_ocean_light, textDecoration: 'none' }}>
              <Phone size={12} /> {c.number}
            </a>
          </div>
        ))}
      </div>

      {/* Safety checklist */}
      <div className="glass-card" style={{ padding: 20 }}>
        <div style={{ fontFamily: 'Outfit,sans-serif', fontSize: 16, fontWeight: 700, color: 'var(--text-main)', marginBottom: 14 }}>
          Pre-Departure Safety Checklist
          <span style={{ fontSize: 12, fontWeight: 400, color: 'rgba(126,200,227,0.5)', marginLeft: 8 }}>
            {checked.filter(Boolean).length}/{checklist.length} complete
          </span>
        </div>
        {checklist.map((item, i) => (
          <div key={i} onClick={() => toggleCheck(i)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
            {checked[i]
              ? <CheckSquare size={16} color="#4ade80" />
              : <Square size={16} style={{ color: 'rgba(126,200,227,0.3)' }} />}
            <span style={{ fontSize: 13, color: checked[i] ? 'rgba(184,223,240,0.5)' : 'rgba(184,223,240,0.8)', textDecoration: checked[i] ? 'line-through' : 'none' }}>
              {item}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// workaround for template literal in JSX attribute
const var_ocean_light = '#7ec8e3'
