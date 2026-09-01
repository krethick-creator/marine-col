import { useState } from 'react'
import { Search, MapPin, Navigation, X } from 'lucide-react'
import { useTranslation } from '../../locales'
import { searchLocation, type GeocodingResult } from '../../services/api/weatherService'

interface LocationPromptModalProps {
  onSelectLocation: (coords: { lat: number, lon: number }, name: string) => void
  onClose?: () => void
  isDismissible?: boolean
}

const QUICK_LOCATIONS = [
  { name: 'Chennai, India', lat: 13.0827, lon: 80.2707 },
  { name: 'Puducherry, India', lat: 11.9416, lon: 79.8083 },
  { name: 'Tuticorin, India', lat: 8.7973, lon: 78.1348 },
  { name: 'Vishakhapatnam, India', lat: 17.6868, lon: 83.2185 },
  { name: 'Kanyakumari, India', lat: 8.0883, lon: 77.5385 },
  { name: 'Cochin, India', lat: 9.9312, lon: 76.2673 },
  { name: 'Mumbai, India', lat: 18.9220, lon: 72.8223 },
  { name: 'Mangalore, India', lat: 12.9141, lon: 74.8560 }
]

export default function LocationPromptModal({ onSelectLocation, onClose, isDismissible = false }: LocationPromptModalProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<GeocodingResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isDetecting, setIsDetecting] = useState(false)
  const { t } = useTranslation()

  const handleDetectLocation = () => {
    setIsDetecting(true)
    setError(null)

    if (!navigator.geolocation) {
      setError(t('location.geoNotSupported'))
      setIsDetecting(false)
      return
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&accept-language=en`)
          const data = await res.json()
          const addr = data.address || {}
          const city = addr.city || addr.town || addr.village || addr.suburb || ''
          const district = addr.state_district || addr.county || ''
          const state = addr.state || ''
          const country = addr.country || ''
          const parts = [city, district, state, country].filter(Boolean)
          const locationName = parts.length > 0 ? parts.join(', ') : data.display_name || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`
          onSelectLocation({ lat: latitude, lon: longitude }, locationName)
        } catch (err) {
          onSelectLocation({ lat: latitude, lon: longitude }, 'Current Location')
        } finally {
          setIsDetecting(false)
        }
      },
      (err) => {
        console.error('Geolocation error:', err)
        setError(t('location.permissionDenied'))
        setIsDetecting(false)
      },
      { timeout: 10000, enableHighAccuracy: true }
    )
  }

  const handleSearch = async () => {
    if (!query.trim()) return
    setLoading(true)
    setError(null)
    try {
      const data = await searchLocation(query)
      if (data.length === 0) {
        setError(t('location.noResults'))
      } else {
        setResults(data)
      }
    } catch (err) {
      setError(t('location.searchFailed'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="location-modal glass-card">
      {isDismissible && (
        <button className="location-close" onClick={onClose}><X size={20} /></button>
      )}

      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div style={{ display: 'inline-flex', padding: 16, borderRadius: '50%', background: 'rgba(126,200,227,0.1)', marginBottom: 16 }}>
          <MapPin size={32} color="var(--accent-blue)" />
        </div>
        <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>{t('location.selectTitle')}</h2>
        <p style={{ fontSize: 14, color: 'var(--text-light)', lineHeight: 1.5, maxWidth: 380, margin: '0 auto' }}>
          {t('location.selectDesc')}
        </p>
      </div>

      <button className="location-btn-primary" onClick={handleDetectLocation} disabled={isDetecting}>
        {isDetecting ? (
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>{t('location.detectingLocation')}</span>
        ) : (
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Navigation size={18} /> {t('location.useMyLocation')}</span>
        )}
      </button>

      <div className="location-divider">
        <span>{t('location.orSearchManually')}</span>
      </div>

      <div className="location-search-box">
        <input
          type="text"
          placeholder={t('location.searchPlaceholder')}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
        />
        <button onClick={handleSearch} disabled={loading}>
          {loading ? '...' : <Search size={18} />}
        </button>
      </div>

      {error && <div className="location-error">{error}</div>}

      <div className="location-results">
        {results.map((res, i) => (
          <div key={i} className="location-result-item" onClick={() => onSelectLocation({ lat: res.lat, lon: res.lon }, res.name)}>
            <MapPin size={16} color="var(--accent-blue)" style={{ flexShrink: 0, marginTop: 2 }} />
            <div>
              <div style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: 15 }}>{res.name}</div>
              {(res.state || res.country) && (
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{[res.state, res.country].filter(Boolean).join(', ')}</div>
              )}
            </div>
          </div>
        ))}
      </div>

      {results.length === 0 && !loading && !error && (
        <div style={{ marginTop: 24 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>{t('location.quickOptions')}</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {QUICK_LOCATIONS.map((loc, i) => (
              <button key={i} className="location-quick-btn" onClick={() => onSelectLocation({ lat: loc.lat, lon: loc.lon }, loc.name)}>
                {loc.name.split(',')[0]}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
