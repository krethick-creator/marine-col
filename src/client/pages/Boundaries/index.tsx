import { useEffect, useRef, useState } from 'react'
import * as maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { useAppStore } from '../../store'
import { useTranslation } from '../../locales'
import { MapPin, Navigation, Shield, AlertTriangle, Info, CheckCircle2, ChevronRight, X } from 'lucide-react'
import DataStatusBadge from '../../components/ui/DataStatusBadge'

export default function BoundariesPage() {
  const { t } = useTranslation()
  const { user, offlineMode } = useAppStore()
  const mapContainer = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  
  const [boundaries, setBoundaries] = useState<any[]>([])
  const [selectedBoundary, setSelectedBoundary] = useState<any | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const markerRef = useRef<maplibregl.Marker | null>(null)

  const loadBoundaries = async (lat: number, lon: number) => {
    setLoading(true)
    setError(null)
    try {
      const { fetchBoundaries } = await import('../../services/api/boundaryService')
      const json = await fetchBoundaries(lat, lon)
      if (json.ok && json.data && json.data.boundaries) {
        const fetchedBounds = json.data.boundaries
        setBoundaries(fetchedBounds)
        if (fetchedBounds.length > 0 && !selectedBoundary) {
          setSelectedBoundary(fetchedBounds[0])
        }
        updateMap(lat, lon, fetchedBounds)
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
    const lat = user.location?.lat ?? 13.0827
    const lon = user.location?.lon ?? 80.2707

    if (!mapRef.current) {
      const map = new maplibregl.Map({
        container: mapContainer.current,
        style: 'https://tiles.openfreemap.org/styles/liberty',
        center: [lon, lat],
        zoom: 8,
      })
      mapRef.current = map

      map.on('load', () => {
        loadBoundaries(lat, lon)
      })

      map.on('click', 'nearby-boundaries-lines', (e) => {
        if (e.features && e.features.length > 0) {
          const featId = e.features[0].properties?.id
          const bound = boundaries.find(b => b.id === featId)
          if (bound) setSelectedBoundary(bound)
        }
      })

      map.on('click', 'nearby-boundaries-fills', (e) => {
        if (e.features && e.features.length > 0) {
          const featId = e.features[0].properties?.id
          const bound = boundaries.find(b => b.id === featId)
          if (bound) setSelectedBoundary(bound)
        }
      })

    } else {
      loadBoundaries(lat, lon)
    }
  }, [user.location?.lat, user.location?.lon])

  const updateMap = (lat: number, lon: number, bounds: any[]) => {
    const map = mapRef.current
    if (!map) return

    map.flyTo({ center: [lon, lat], zoom: 8 })

    if (markerRef.current) markerRef.current.remove()
    
    // User GPS Location Marker
    const popup = new maplibregl.Popup({ offset: 25, closeButton: false })
      .setHTML(`<div style="color: #000; font-weight: bold; font-family: sans-serif; font-size: 13px; padding: 4px;">📍 ${t('boundaries.currentLocation') || 'Your Location'}</div>`)

    markerRef.current = new maplibregl.Marker({ color: '#2ecc71' })
      .setLngLat([lon, lat])
      .setPopup(popup)
      .addTo(map)

    if (!map.isStyleLoaded()) {
      map.once('styledata', () => updateMap(lat, lon, bounds))
      return
    }

    // Separate LineString and Polygon features for exact MapLibre rendering
    const lineFeatures = bounds
      .filter(b => b.geometry && (b.geometry.type === 'LineString' || b.geometry.type === 'MultiLineString'))
      .map(b => ({
        type: 'Feature',
        properties: { 
          id: b.id, 
          name: b.name, 
          status: b.status, 
          type: b.type,
          isNearest: bounds[0]?.id === b.id,
          distanceNm: (b.distanceMeters * 0.000539957).toFixed(1)
        },
        geometry: b.geometry
      }))

    const polygonFeatures = bounds
      .filter(b => b.geometry && (b.geometry.type === 'Polygon' || b.geometry.type === 'MultiPolygon'))
      .map(b => ({
        type: 'Feature',
        properties: { 
          id: b.id, 
          name: b.name, 
          status: b.status, 
          type: b.type, 
          inside: b.inside,
          isNearest: bounds[0]?.id === b.id,
          distanceNm: (b.distanceMeters * 0.000539957).toFixed(1)
        },
        geometry: b.geometry
      }))

    // Add or Update Sources
    const lineCollection = { type: 'FeatureCollection', features: lineFeatures }
    const polyCollection = { type: 'FeatureCollection', features: polygonFeatures }

    if (map.getSource('boundary-lines')) {
      (map.getSource('boundary-lines') as maplibregl.GeoJSONSource).setData(lineCollection as any)
    } else {
      map.addSource('boundary-lines', { type: 'geojson', data: lineCollection as any })
      map.addLayer({
        id: 'nearby-boundaries-lines',
        type: 'line',
        source: 'boundary-lines',
        paint: {
          'line-color': [
            'case',
            ['get', 'isNearest'], '#ffd166',
            '#ff3b30'
          ],
          'line-width': [
            'case',
            ['get', 'isNearest'], 4,
            2.5
          ],
          'line-dasharray': [3, 2]
        }
      })

      map.addLayer({
        id: 'nearby-boundaries-line-labels',
        type: 'symbol',
        source: 'boundary-lines',
        layout: {
          'text-field': ['concat', ['get', 'name'], ' (', ['get', 'distanceNm'], ' nm)'],
          'text-size': 12,
          'symbol-placement': 'line-center',
          'text-offset': [0, -1]
        },
        paint: {
          'text-color': '#ffffff',
          'text-halo-color': '#000000',
          'text-halo-width': 2
        }
      })
    }

    if (map.getSource('boundary-polygons')) {
      (map.getSource('boundary-polygons') as maplibregl.GeoJSONSource).setData(polyCollection as any)
    } else {
      map.addSource('boundary-polygons', { type: 'geojson', data: polyCollection as any })
      map.addLayer({
        id: 'nearby-boundaries-fills',
        type: 'fill',
        source: 'boundary-polygons',
        paint: {
          'fill-color': [
            'match', ['get', 'type'],
            'protected_area', '#34c759',
            'military', '#ff3b30',
            'hazard', '#ff9f0a',
            '#ff9f0a'
          ],
          'fill-opacity': [
            'case',
            ['get', 'inside'], 0.55,
            ['get', 'isNearest'], 0.4,
            0.25
          ]
        }
      })

      map.addLayer({
        id: 'nearby-boundaries-poly-outlines',
        type: 'line',
        source: 'boundary-polygons',
        paint: {
          'line-color': [
            'match', ['get', 'type'],
            'protected_area', '#2ecc71',
            'military', '#ff3b30',
            '#ff9f0a'
          ],
          'line-width': 2
        }
      })

      map.addLayer({
        id: 'nearby-boundaries-poly-labels',
        type: 'symbol',
        source: 'boundary-polygons',
        layout: {
          'text-field': ['get', 'name'],
          'text-size': 12,
          'text-anchor': 'center'
        },
        paint: {
          'text-color': '#ffffff',
          'text-halo-color': '#000000',
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

      {/* Floating Card Sidebar Panel */}
      <div style={{ 
        position: 'absolute', 
        top: 24, 
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
          <h1 className="page-title" style={{ fontSize: 24, marginBottom: 4 }}>{t('boundaries.title') || 'Maritime Boundaries'}</h1>
          <p className="page-subtitle" style={{ margin: 0, fontSize: 13 }}>
            {(!navigator.onLine || offlineMode) 
              ? (t('boundaries.offlineSub') || 'Viewing offline cached boundaries')
              : (t('boundaries.realtimeSub') || 'Live PostGIS spatial boundary analysis')}
          </p>
        </div>

        <div style={{ padding: 20, flex: 1, overflowY: 'auto' }}>
          {/* User Location Card */}
          <div className="glass-card" style={{ padding: 16, marginBottom: 20, background: 'rgba(255,255,255,0.03)', borderRadius: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, color: 'var(--text-light)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase' }}>
              <MapPin size={14} /> {(!navigator.onLine || offlineMode) ? (t('boundaries.lastLocation') || 'Last Known GPS') : (t('boundaries.currentLocation') || 'Current GPS Location')}
            </div>
            {user.location ? (
              <>
                <div style={{ fontSize: 15, fontWeight: 600, color: '#fff', marginBottom: 4 }}>
                  {user.locationName || (t('boundaries.unknownLocation') || 'Current Coordinates')}
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                  {user.location.lat.toFixed(4)}° N, {user.location.lon.toFixed(4)}° E
                </div>
                <button 
                  className="orca-btn" 
                  style={{ marginTop: 12, width: '100%', padding: '8px 12px', fontSize: 12, borderRadius: 8, cursor: 'pointer' }} 
                  onClick={() => loadBoundaries(user.location!.lat, user.location!.lon)}
                >
                  {t('boundaries.refreshLocation') || 'Recalculate Spatial Boundaries'}
                </button>
              </>
            ) : (
              <div style={{ fontSize: 14, color: 'var(--status-nogo)' }}>{t('boundaries.locationNotSet') || 'Location not set'}</div>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, color: 'var(--text-light)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase' }}>
            <Shield size={14} /> {t('boundaries.nearbyBoundaries') || 'Nearest PostGIS Boundaries'}
          </div>

          {loading && <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>{t('boundaries.scanning') || 'Querying spatial boundaries...'}</div>}
          
          {error && (!navigator.onLine || offlineMode) && error.includes('Offline') ? (
            <div style={{ fontSize: 14, color: 'var(--status-nogo)', padding: 16, background: 'rgba(239, 68, 68, 0.05)', borderRadius: 8, border: '1px solid rgba(239, 68, 68, 0.2)' }}>
              <div style={{ fontWeight: 600, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                <AlertTriangle size={16} /> {t('boundaries.noCached') || 'No cached boundary data'}
              </div>
              <div style={{ color: 'var(--text-muted)' }}>{t('boundaries.connectInternet') || 'Connect to internet to download PostGIS boundaries.'}</div>
            </div>
          ) : error && (
            <div style={{ color: 'var(--status-nogo)', fontSize: 14 }}>{error}</div>
          )}
          
          {!loading && !error && boundaries.length === 0 && (
            <div style={{ fontSize: 14, color: 'var(--text-muted)', padding: 16, background: 'rgba(255,255,255,0.02)', borderRadius: 8 }}>
              {t('boundaries.noRestricted') || 'No restricted boundaries nearby.'}
            </div>
          )}

          {!loading && !error && boundaries.map((b, idx) => {
            const isNearest = idx === 0
            const isSelected = selectedBoundary?.id === b.id
            const distNm = (b.distanceMeters * 0.000539957).toFixed(1)
            const distKm = (b.distanceMeters / 1000).toFixed(1)

            return (
              <div 
                key={b.id || idx} 
                onClick={() => {
                  setSelectedBoundary(b)
                  if (mapRef.current && b.geometry) {
                    if (b.geometry.type === 'Point') {
                      mapRef.current.flyTo({ center: b.geometry.coordinates, zoom: 10 })
                    } else if (b.geometry.type === 'LineString') {
                      const mid = b.geometry.coordinates[Math.floor(b.geometry.coordinates.length / 2)]
                      mapRef.current.flyTo({ center: mid, zoom: 9 })
                    }
                  }
                }}
                style={{ 
                  background: b.inside 
                    ? 'rgba(239, 68, 68, 0.15)' 
                    : isSelected 
                      ? 'rgba(45, 139, 186, 0.2)' 
                      : 'rgba(255,255,255,0.04)', 
                  border: b.inside 
                    ? '1.5px solid #ef4444' 
                    : isSelected 
                      ? '1.5px solid #2d8bba' 
                      : '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 10, padding: 16, marginBottom: 12, cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <div>
                    <div style={{ fontWeight: 600, color: b.inside ? '#fca5a5' : '#fff', fontSize: 15, display: 'flex', alignItems: 'center', gap: 6 }}>
                      {b.name}
                      {isNearest && <span style={{ background: '#ffd166', color: '#000', fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4 }}>NEAREST</span>}
                    </div>
                  </div>
                  {b.inside && <AlertTriangle size={16} color="#ef4444" />}
                </div>

                <div style={{ display: 'flex', gap: 12, fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
                  <span style={{ textTransform: 'capitalize' }}>{b.type ? b.type.replace('_', ' ') : 'Boundary'}</span>
                  <span>•</span>
                  <span style={{ 
                    fontWeight: 600,
                    color: b.inside ? '#ef4444' :
                      b.status === 'SAFE' ? '#4ade80' : 
                      b.status === 'NEARBY' ? '#3b82f6' : 
                      b.status === 'CAUTION' ? '#facc15' : '#ef4444' 
                  }}>
                    {b.inside ? 'INSIDE RESTRICTED ZONE' : b.status}
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, background: 'rgba(0,0,0,0.25)', padding: 10, borderRadius: 6 }}>
                  <div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 2 }}>DISTANCE</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>
                      {b.inside ? 'Inside Area' : `${distNm} nm (${distKm} km)`}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 2 }}>BEARING / DIRECTION</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Navigation size={12} style={{ transform: 'rotate(45deg)' }} /> {b.direction || 'N/A'}
                    </div>
                  </div>
                </div>

                {b.inside && (
                  <div style={{ marginTop: 10, padding: 8, background: 'rgba(239, 68, 68, 0.1)', borderRadius: 6, fontSize: 12, color: '#fca5a5', display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                    <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 2 }} />
                    <div>You are currently inside this restricted zone! Exercise extreme caution and alter course immediately.</div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Footer info */}
        <div style={{ padding: 16, borderTop: '1px solid rgba(255,255,255,0.1)', fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', display: 'flex', justifyContent: 'center', gap: 8, alignItems: 'center' }}>
          <span>{t('boundaries.source') || 'Data Source:'} {
            (!navigator.onLine || offlineMode)
              ? (boundaries.length > 0 && (boundaries[0] as any).isCached ? (t('boundaries.cachedData') || 'Cached') : (t('boundaries.noDataAvailable') || 'No Data'))
              : 'PostGIS (live)'
          }</span>
          <span>|</span>
          <DataStatusBadge 
            isCached={boundaries.length > 0 && (boundaries[0] as any).isCached} 
            fetchedAt={boundaries.length > 0 ? (boundaries[0] as any).fetchedAt : undefined} 
          />
        </div>
      </div>

      {/* Selected Boundary Details Modal */}
      {selectedBoundary && (
        <div style={{
          position: 'absolute', bottom: 24, right: 24, zIndex: 20, width: 340,
          background: 'rgba(10,20,30,0.9)', backdropFilter: 'blur(12px)',
          border: '1px solid rgba(45,139,186,0.4)', borderRadius: 12, padding: 16,
          color: '#e0f0ff', fontFamily: 'Outfit, sans-serif'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Shield size={16} color="#2d8bba" /> Boundary Details
            </h3>
            <button 
              onClick={() => setSelectedBoundary(null)}
              style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: 2 }}
            >
              <X size={16} />
            </button>
          </div>

          <div style={{ fontSize: 14, fontWeight: 600, color: '#fff', marginBottom: 4 }}>{selectedBoundary.name}</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12, textTransform: 'capitalize' }}>
            Type: {selectedBoundary.type ? selectedBoundary.type.replace('_', ' ') : 'Boundary'}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ opacity: 0.7 }}>Status:</span>
              <span style={{ fontWeight: 600, color: selectedBoundary.inside ? '#ef4444' : '#4ade80' }}>
                {selectedBoundary.inside ? 'INSIDE RESTRICTED AREA' : selectedBoundary.status}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ opacity: 0.7 }}>Distance to User:</span>
              <span style={{ fontWeight: 600 }}>
                {selectedBoundary.inside ? '0 km (Inside)' : `${(selectedBoundary.distanceMeters * 0.000539957).toFixed(1)} nm (${(selectedBoundary.distanceMeters / 1000).toFixed(1)} km)`}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ opacity: 0.7 }}>Direction / Bearing:</span>
              <span style={{ fontWeight: 600 }}>{selectedBoundary.direction || 'N/A'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ opacity: 0.7 }}>Data Provider:</span>
              <span style={{ fontWeight: 600 }}>{selectedBoundary.source || 'PostGIS (live)'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ opacity: 0.7 }}>Last Updated:</span>
              <span style={{ fontWeight: 600 }}>{new Date().toLocaleTimeString()}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
