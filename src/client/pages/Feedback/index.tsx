import { useState } from 'react'
import { Send, Star } from 'lucide-react'

export default function FeedbackPage() {
  const [rating, setRating] = useState(0)
  const [hover, setHover] = useState(0)
  const [message, setMessage] = useState('')
  const [submitted, setSubmitted] = useState(false)

  if (submitted) {
    return (
      <div className="page-shell" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div className="glass-card" style={{ padding: 40, textAlign: 'center', maxWidth: 400 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🙏</div>
          <div style={{ fontFamily: 'Outfit,sans-serif', fontSize: 20, fontWeight: 700, color: 'var(--text-main)', marginBottom: 8 }}>
            Thank you!
          </div>
          <div style={{ fontSize: 13, color: 'rgba(184,223,240,0.5)' }}>
            Your feedback helps improve ORCA for the entire fishing community.
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="page-shell">
      <div className="page-header">
        <div>
          <h1 className="page-title">Feedback</h1>
          <p className="page-subtitle">Help us improve ORCA for your community</p>
        </div>
      </div>

      <div className="glass-card" style={{ padding: 28, maxWidth: 540 }}>
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 13, color: 'rgba(126,200,227,0.6)', marginBottom: 10 }}>Rate your experience</div>
          <div style={{ display: 'flex', gap: 8 }}>
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                size={28}
                fill={(hover || rating) >= star ? '#f59e0b' : 'transparent'}
                color={(hover || rating) >= star ? '#f59e0b' : 'rgba(126,200,227,0.25)'}
                style={{ cursor: 'pointer', transition: 'all 0.15s' }}
                onMouseEnter={() => setHover(star)}
                onMouseLeave={() => setHover(0)}
                onClick={() => setRating(star)}
              />
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 13, color: 'rgba(126,200,227,0.6)', marginBottom: 8 }}>Your feedback</div>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="What could ORCA do better? What features helped you most?"
            rows={5}
            style={{
              width: '100%', background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12,
              padding: '12px 14px', color: '#e8f4fb', fontSize: 13,
              fontFamily: 'Inter,sans-serif', resize: 'vertical', outline: 'none',
            }}
          />
        </div>

        <button
          onClick={() => setSubmitted(true)}
          disabled={!rating && !message}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '10px 24px', borderRadius: 12,
            background: 'linear-gradient(135deg, #1e5fa8, #2d8bba)',
            border: 'none', color: 'var(--text-main)', fontSize: 14, fontWeight: 600,
            cursor: 'pointer', transition: 'all 0.2s', opacity: (!rating && !message) ? 0.4 : 1,
          }}
          id="submit-feedback-btn"
        >
          <Send size={14} /> Submit Feedback
        </button>
      </div>
    </div>
  )
}
