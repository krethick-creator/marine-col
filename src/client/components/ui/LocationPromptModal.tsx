import { useState } from 'react'
import { MapPin, Navigation, Search, AlertCircle, X, ShieldAlert } from 'lucide-react'
import { useAppStore } from '../../store'

interface SearchResult {
  display_name: string
  lat: string
  lon: string
}

export default function LocationPromptModal() {
  const { showLocationModal, setShowLocationModal, setLocation } = useAppStore()
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!showLocationModal) return null

  // Fast options
  const defaultLocations = [
    { name: 'Chennai, Tamil Nadu, India', lat: 13.0827, lon: 80.2707 },
    { name: 'Puducherry, Puducherry, India', lat: 11.9416, lon: 79.8083 },
    { name: 'Tuticorin, Tamil Nadu, India', lat: 8.7973, lon: 78.1348 },
    { name: 'Vishakhapatnam, Andhra Pradesh, India', lat: 17.6868, lon: 83.2185 },
    { name: 'Kanyakumari, Tamil Nadu, India', lat: 8.0883, lon: 77.5385 },
    { name: 'Cochin, Kerala, India', lat: 9.9312, lon: 76.2673 },
    { name: 'Mumbai, Maharashtra, India', lat: 18.9220, lon: 72.8223 },
    { name: 'Mangalore, Karnataka, India', lat: 12.9141, lon: 74.8560 }
  ]

  const handleDetectLocation = () => {
    setLoading(true)
    setError(null)

    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.')
      setLoading(false)
      return
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords
        try {
          // Reverse geocode via Nominatim
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=12`,
            {
              headers: {
                'User-Agent': 'ORCA-Marine-Intelligence/1.0 (contact: support@orca.gov)'
              }
            }
          )
          if (!res.ok) throw new Error('Failed to reverse geocode')
          const data = await res.json()
          
          const addr = data.address || {}
          const city = addr.city || addr.town || addr.village || addr.suburb || ''
          const district = addr.state_district || addr.county || ''
          const state = addr.state || ''
          const country = addr.country || ''

          const parts = [city, district, state, country].filter(Boolean)
          const locationName = parts.length > 0 ? parts.join(', ') : data.display_name || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`

          setLocation(latitude, longitude, locationName)
          setLoading(false)
        } catch (err) {
          console.error(err)
          // Fallback to coordinate name if reverse geocoding fails
          setLocation(latitude, longitude, `${latitude.toFixed(4)}N, ${longitude.toFixed(4)}E`)
          setLoading(false)
        }
      },
      (err) => {
        console.warn('Geolocation error:', err)
        setError('Location permission denied or unavailable. Please enable browser location access or select a location manually.')
        setLoading(false)
      },
      { timeout: 10000 }
    )
  }

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchQuery.trim()) return

    setLoading(true)
    setError(null)
    setSearchResults([])

    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&countrycodes=in&limit=5`,
        {
          headers: {
            'User-Agent': 'ORCA-Marine-Intelligence/1.0 (contact: support@orca.gov)'
          }
        }
      )
      if (!res.ok) throw new Error('Search failed')
      const data = await res.json()
      setSearchResults(data)
      if (data.length === 0) {
        setError('No locations found matching your search. Please try a different query.')
      }
    } catch (err) {
      console.error(err)
      setError('Failed to search locations. Please verify your connection.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-backdrop" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 1000, padding: 16 }}>
      <div className="glass-card" style={{ width: '100%', maxWidth: 500, padding: 24, borderRadius: 16, border: '1px solid rgba(255,255,255,0.1)', position: 'relative', background: 'rgba(21, 32, 43, 0.95)', backdropFilter: 'blur(12px)' }}>
        
        {/* Close button if a location has already been selected previously */}
        {localStorage.getItem('orca_lat') && (
          <button 
            style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
            onClick={() => setShowLocationModal(false)}
          >
            <X size={20} />
          </button>
        )}

        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <MapPin size={40} color="var(--accent-blue)" style={{ margin: '0 auto 12px' }} />
          <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-main)' }}>Select Your Location</h2>
          <p style={{ fontSize: 13, color: 'var(--text-light)', marginTop: 6, lineHeight: 1.4 }}>
            ORCA uses your location to fetch real-time marine weather, satellite data, alerts, and safety advisories.
          </p>
        </div>

        {error && (
          <div className="glass" style={{ display: 'flex', gap: 10, padding: 12, borderRadius: 10, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', marginBottom: 16, alignItems: 'flex-start' }}>
            <AlertCircle size={18} color="var(--status-nogo)" style={{ flexShrink: 0, marginTop: 1 }} />
            <span style={{ fontSize: 12, color: 'var(--text-light)', lineHeight: 1.4 }}>{error}</span>
          </div>
        )}

        {/* Browser Geolocation Button */}
        <button
          className="btn"
          onClick={handleDetectLocation}
          disabled={loading}
          style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, height: 44, fontSize: 14, fontWeight: 600, cursor: 'pointer', marginBottom: 16, background: 'var(--accent-blue)', color: 'white', border: 'none', borderRadius: 10 }}
        >
          <Navigation size={16} />
          {loading ? 'Detecting Location...' : 'Use My Current Location'}
        </button>

        <div style={{ display: 'flex', alignItems: 'center', margin: '16px 0', color: 'var(--text-muted)', fontSize: 12 }}>
          <hr style={{ flex: 1, border: 'none', borderTop: '1px solid rgba(255,255,255,0.1)' }} />
          <span style={{ padding: '0 10px' }}>OR SEARCH MANUALLY</span>
          <hr style={{ flex: 1, border: 'none', borderTop: '1px solid rgba(255,255,255,0.1)' }} />
        </div>

        {/* Search Fallback */}
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <input
              type="text"
              placeholder="Search coastal cities (e.g. Puducherry)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: '100%', height: 38, paddingLeft: 34, paddingRight: 12, borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.2)', color: 'var(--text-main)', fontSize: 13 }}
            />
            <Search size={14} color="var(--text-muted)" style={{ position: 'absolute', left: 12, top: 12 }} />
          </div>
          <button type="submit" className="btn" style={{ padding: '0 16px', borderRadius: 10, height: 38, fontSize: 13, background: 'var(--accent-blue)', color: 'white', border: 'none', cursor: 'pointer' }}>
            Search
          </button>
        </form>

        {/* Search Results */}
        {searchResults.length > 0 && (
          <div style={{ maxHeight: 150, overflowY: 'auto', marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {searchResults.map((result, idx) => (
              <div
                key={idx}
                className="glass"
                onClick={() => setLocation(parseFloat(result.lat), parseFloat(result.lon), result.display_name)}
                style={{ padding: '10px 12px', borderRadius: 8, cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', gap: 8 }}
              >
                <MapPin size={12} color="var(--text-muted)" />
                <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{result.display_name}</span>
              </div>
            ))}
          </div>
        )}

        {/* Quick Selections */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Quick Coastal Options</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
            {defaultLocations.map((loc, idx) => (
              <button
                key={idx}
                onClick={() => setLocation(loc.lat, loc.lon, loc.name)}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 10px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.02)', color: 'var(--text-light)', fontSize: 12, cursor: 'pointer', textAlign: 'left', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}
              >
                <MapPin size={10} color="var(--accent-blue)" style={{ flexShrink: 0 }} />
                {loc.name.split(',')[0]}
              </button>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
