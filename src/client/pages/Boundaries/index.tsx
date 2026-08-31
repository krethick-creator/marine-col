import { useEffect, useRef, useState } from 'react'
import * as maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { useAppStore } from '../../store'
import { MapPin, Navigation, Shield, AlertTriangle } from 'lucide-react'
import DataStatusBadge from '../../components/ui/DataStatusBadge';

export default function BoundariesPage() {
  const { user, offlineMode } = useAppStore()
  const mapContainer = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  
  const [boundaries, setBoundaries] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const markerRef = useRef<maplibregl.Marker | null>(null)

  const loadBoundaries = async (lat: number, lon: number) => {
    setLoading(true)
    setError(null)
    try {
      const { fetchBoundaries } = await import('../../services/api/boundaryService')
      const json = await fetchBoundaries(lat, lon)
      if (json.ok) {
        setBoundaries(json.data.boundaries)
        updateMap(lat, lon, json.data.boundaries)
      } else {
        setError(json.error || 'Failed to fetch boundaries')
      }
    } catch (err) {
      setError('Network error fetching boundaries')
    }
    setLoading(false)
  }

  useEffect(() => {
    if (!mapContainer.current) return
    if (!mapRef.current) {
      const map = new maplibregl.Map({
        container: mapContainer.current,
        style: 'https://tiles.openfreemap.org/styles/liberty',
        center: [user.location?.lon || 80.27, user.location?.lat || 13.08],
        zoom: 10,
      })
      mapRef.current = map
      
      map.on('load', () => {
        if (user.location) {
          loadBoundaries(user.location.lat, user.location.lon)
        }
      })
    } else {
      if (user.location) {
        loadBoundaries(user.location.lat, user.location.lon)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.location?.lat, user.location?.lon])

  const updateMap = (lat: number, lon: number, bounds: any[]) => {
    const map = mapRef.current
    if (!map) return

    map.flyTo({ center: [lon, lat], zoom: 11 })

    if (markerRef.current) markerRef.current.remove()
    
    // Create a popup for the marker
    const popup = new maplibregl.Popup({ offset: 25, closeButton: false })
      .setHTML(`<div style="color: #000; font-weight: bold; font-family: sans-serif; font-size: 13px; padding: 4px;">📍 Your Location</div>`)

    markerRef.current = new maplibregl.Marker({ color: '#ff3b30' })
      .setLngLat([lon, lat])
      .setPopup(popup)
      .addTo(map)

    markerRef.current.togglePopup() // show popup by default

    // Wait for style to load before adding sources/layers
    if (!map.isStyleLoaded()) {
      map.once('styledata', () => updateMap(lat, lon, bounds))
      return
    }

    const featureCollection = {
      type: 'FeatureCollection',
      features: bounds.map(b => ({
        type: 'Feature',
        properties: { id: b.id, name: b.name, status: b.status, type: b.type },
        geometry: b.geometry
      }))
    }

    if (map.getSource('nearby-boundaries')) {
      (map.getSource('nearby-boundaries') as maplibregl.GeoJSONSource).setData(featureCollection as any)
    } else {
      map.addSource('nearby-boundaries', { type: 'geojson', data: featureCollection as any })
      map.addLayer({
        id: 'nearby-boundaries-fill',
        type: 'fill',
        source: 'nearby-boundaries',
        paint: {
          'fill-color': [
            'match', ['get', 'type'],
            'protected_area', '#4ade80',
            'military', '#ef4444',
            'hazard', '#f97316',
            '#3b82f6'
          ],
          'fill-opacity': 0.3
        }
      })
      map.addLayer({
        id: 'nearby-boundaries-line',
        type: 'line',
        source: 'nearby-boundaries',
        paint: {
          'line-color': [
            'match', ['get', 'type'],
            'protected_area', '#16a34a',
            'military', '#b91c1c',
            'hazard', '#c2410c',
            '#1d4ed8'
          ],
          'line-width': 2
        }
      })
      
      map.addLayer({
        id: 'nearby-boundaries-labels',
        type: 'symbol',
        source: 'nearby-boundaries',
        layout: {
          'text-field': ['get', 'name'],
          'text-size': 12,
          'text-anchor': 'center'
        },
        paint: {
          'text-color': '#000',
          'text-halo-color': '#fff',
          'text-halo-width': 2
        }
      })
    }
  }

  return (
    <div className="page-shell" style={{ padding: 0, position: 'relative', flex: 1, height: '100%', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0 }}>
        <div ref={mapContainer} style={{ width: '100%', height: '100%' }} />
      </div>

      <div style={{ 
        position: 'absolute', 
        top: 80, 
        left: 24, 
        bottom: 24, 
        width: 420, 
        background: 'rgba(10,20,30,0.85)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderRadius: 16,
        display: 'flex', 
        flexDirection: 'column', 
        border: '1px solid rgba(255,255,255,0.1)', 
        zIndex: 10,
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)'
      }}>
        <div style={{ padding: '24px 20px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <h1 className="page-title" style={{ fontSize: 24, marginBottom: 4 }}>Boundaries</h1>
          <p className="page-subtitle" style={{ margin: 0, fontSize: 13 }}>
            {(!navigator.onLine || offlineMode) 
              ? 'Offline — Cached Geospatial Data' 
              : 'Real-time geospatial marine zones'}
          </p>
        </div>

        <div style={{ padding: 20, flex: 1, overflowY: 'auto' }}>
          <div className="glass-card" style={{ padding: 16, marginBottom: 20, background: 'rgba(255,255,255,0.03)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, color: 'var(--text-light)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase' }}>
              <MapPin size={14} /> {(!navigator.onLine || offlineMode) ? 'Last Known Location' : 'Current Location'}
            </div>
            {user.location ? (
              <>
                <div style={{ fontSize: 15, fontWeight: 600, color: '#fff', marginBottom: 4 }}>
                  {user.locationName || 'Unknown Location'}
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                  {user.location.lat.toFixed(4)}° N, {user.location.lon.toFixed(4)}° E
                </div>
                <button className="orca-btn" style={{ marginTop: 12, width: '100%', padding: '6px 12px', fontSize: 12 }} onClick={() => loadBoundaries(user.location!.lat, user.location!.lon)}>
                  Refresh Location
                </button>
              </>
            ) : (
              <div style={{ fontSize: 14, color: 'var(--status-nogo)' }}>Location not set. Please set your location in the sidebar.</div>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, color: 'var(--text-light)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase' }}>
            <Shield size={14} /> Nearby Boundaries
          </div>

          {loading && <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>Scanning boundaries...</div>}
          
          {error && (!navigator.onLine || offlineMode) && error.includes('Offline') ? (
            <div style={{ fontSize: 14, color: 'var(--status-nogo)', padding: 16, background: 'rgba(239, 68, 68, 0.05)', borderRadius: 8, border: '1px solid rgba(239, 68, 68, 0.2)' }}>
              <div style={{ fontWeight: 600, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                <AlertTriangle size={16} /> No cached boundary data available.
              </div>
              <div style={{ color: 'var(--text-muted)' }}>Connect to the internet to retrieve the latest marine boundary information.</div>
            </div>
          ) : error && (
            <div style={{ color: 'var(--status-nogo)', fontSize: 14 }}>{error}</div>
          )}
          
          {!loading && !error && boundaries.length === 0 && (
            <div style={{ fontSize: 14, color: 'var(--text-muted)', padding: 16, background: 'rgba(255,255,255,0.02)', borderRadius: 8 }}>
              No restricted or protected boundaries found within 50 km.
            </div>
          )}

          {!loading && !error && boundaries.map((b, idx) => (
            <div key={idx} style={{ 
              background: b.inside ? 'rgba(239, 68, 68, 0.15)' : 'rgba(255,255,255,0.04)', 
              border: b.inside ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid rgba(255,255,255,0.08)',
              borderRadius: 10, padding: 16, marginBottom: 12 
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <div style={{ fontWeight: 600, color: b.inside ? '#fca5a5' : '#fff', fontSize: 15 }}>{b.name}</div>
                {b.inside && <AlertTriangle size={16} color="#ef4444" />}
              </div>
              <div style={{ display: 'flex', gap: 12, fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>
                <span style={{ textTransform: 'capitalize' }}>{b.type.replace('_', ' ')}</span>
                <span>•</span>
                <span style={{ color: 
                  b.status === 'SAFE' ? '#4ade80' : 
                  b.status === 'NEARBY' ? '#3b82f6' : 
                  b.status === 'CAUTION' ? '#facc15' : '#ef4444' 
                }}>{b.status}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, background: 'rgba(0,0,0,0.2)', padding: 12, borderRadius: 6 }}>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>DISTANCE</div>
                  <div style={{ fontSize: 14, fontWeight: 500, color: '#fff' }}>
                    {b.inside ? 'Inside' : b.distanceMeters > 1000 ? (b.distanceMeters/1000).toFixed(1) + ' km' : b.distanceMeters + ' m'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>DIRECTION</div>
                  <div style={{ fontSize: 14, fontWeight: 500, color: '#fff', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Navigation size={12} style={{ transform: 'rotate(45deg)' }} /> {b.direction}
                  </div>
                </div>
              </div>
              {b.inside && (
                <div style={{ marginTop: 12, padding: 8, background: 'rgba(239, 68, 68, 0.1)', borderRadius: 6, fontSize: 12, color: '#fca5a5', display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                  <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 2 }} />
                  <div>You are currently inside a restricted marine zone. Please verify applicable local regulations.</div>
                </div>
              )}
            </div>
          ))}
        </div>
        <div style={{ padding: 16, borderTop: '1px solid rgba(255,255,255,0.1)', fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', display: 'flex', justifyContent: 'center', gap: 8, alignItems: 'center' }}>
          <span>Source: {
            (!navigator.onLine || offlineMode)
              ? (boundaries.length > 0 && (boundaries[0] as any).isCached ? 'Cached Data' : 'No Data Available')
              : 'PostGIS'
          }</span>
          <span>|</span>
          <DataStatusBadge 
            isCached={boundaries.length > 0 && (boundaries[0] as any).isCached} 
            fetchedAt={boundaries.length > 0 ? (boundaries[0] as any).fetchedAt : undefined} 
          />
        </div>
      </div>
    </div>
  )
}
