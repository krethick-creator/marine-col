import { useState, useEffect, useRef } from 'react'
import * as maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { analyzeTrip, routeToGeoJSON, getRouteStatusColor, type TripAnalysisResult } from '../../services/api/routeService'
import { useTranslation } from '../../locales'
import { useAppStore } from '../../store'
import { useAuthStore } from '../../store/authStore'
import { mapRoleToCanonicalRole, ROLE_CONFIGS } from '../../config/roleConfig'

const PRESET_ROUTES = [
  { name: 'Chennai → Puducherry', origin: { name: 'Chennai Harbour', lat: 13.0827, lon: 80.2707 }, dest: { name: 'Puducherry Port', lat: 11.9416, lon: 79.8083 } },
  { name: 'Chennai → Fishing Ground', origin: { name: 'Chennai Harbour', lat: 13.0827, lon: 80.2707 }, dest: { name: 'Offshore Fishing Ground', lat: 13.2500, lon: 80.5000 } },
  { name: 'Chennai → Nagapattinam', origin: { name: 'Chennai Harbour', lat: 13.0827, lon: 80.2707 }, dest: { name: 'Nagapattinam Port', lat: 10.7656, lon: 79.8424 } },
  { name: 'Chennai → Kakinada', origin: { name: 'Chennai Harbour', lat: 13.0827, lon: 80.2707 }, dest: { name: 'Kakinada Coast', lat: 16.9891, lon: 82.2475 } },
]

export default function TripPlannerPage() {
  const { t } = useTranslation()
  const instanceId = useRef(Math.random().toString(36).slice(2))
  console.log('[TripPlanner] render instance:', instanceId.current)

  const [originName, setOriginName] = useState('Chennai Harbour')
  const [originLat, setOriginLat] = useState(13.0827)
  const [originLon, setOriginLon] = useState(80.2707)

  const [destName, setDestName] = useState('Puducherry Port')
  const [destLat, setDestLat] = useState(11.9416)
  const [destLon, setDestLon] = useState(79.8083)

  const [departureDate, setDepartureDate] = useState(() => new Date().toISOString().split('T')[0])
  const [departureTime, setDepartureTime] = useState('06:00')
  const [boatKey, setBoatKey] = useState<'small' | 'mechanized'>(() => {
    try {
      const saved = localStorage.getItem('trip_planner_boat_key')
      return (saved === 'small' || saved === 'mechanized') ? saved : 'small'
    } catch {
      return 'small'
    }
  })

  const { user: authUser } = useAuthStore()
  const { user: appUser } = useAppStore()
  const rawRole = authUser?.role || (appUser as any)?.role
  const canonicalRole = mapRoleToCanonicalRole(rawRole)
  const roleConfig = ROLE_CONFIGS[canonicalRole]

  const defaultPurpose = roleConfig.tripPlannerDefaultPurpose === 'research' ? 'Research' : roleConfig.tripPlannerDefaultPurpose === 'fishing' ? 'Fishing' : 'General'
  const [purpose, setPurpose] = useState(defaultPurpose)

  useEffect(() => {
    try {
      localStorage.setItem('trip_planner_boat_key', boatKey)
    } catch (e) {
      console.warn('Failed to save boatKey to localStorage:', e)
    }
  }, [boatKey])

  const [analysis, setAnalysis] = useState<TripAnalysisResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})

  const mapContainer = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const markersRef = useRef<maplibregl.Marker[]>([])
  const mapLoadedRef = useRef<boolean>(false)
  const requestCountRef = useRef<number>(0)

  // Debug lifecycle
  useEffect(() => {
    console.log('[TripPlanner] MOUNT instance:', instanceId.current)
    return () => {
      console.log('[TripPlanner] UNMOUNT instance:', instanceId.current)
    }
  }, [])

  // 1. Initialize MapLibre map exactly once
  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return

    try {
      console.log('[MapLibre] Initializing map')
      const map = new maplibregl.Map({
        container: mapContainer.current,
        style: 'https://tiles.openfreemap.org/styles/liberty',
        center: [80.2707, 13.0827],
        zoom: 7,
      })

      map.on('load', () => {
        console.log('[MapLibre] Map loaded')
        mapLoadedRef.current = true
        // Ensure map recalculates its container size
        map.resize()
      })

      mapRef.current = map
      console.log('[MapLibre] Creating map instance')
      console.log('[MapLibre] Existing map:', mapRef.current)
    } catch (error) {
      console.error('[MapLibre] Initialization failed:', error)
    }

    return () => {
      if (mapRef.current) {
        console.log('[MapLibre] Cleaning up map')
        mapRef.current.remove()
        mapRef.current = null
        mapLoadedRef.current = false
      }
    }
  }, [])

  console.log('[MapLibre] Component render')

  // 2. Update route GeoJSON only after map has loaded and route data changes
  useEffect(() => {
    if (!analysis || !analysis.route) return
    const map = mapRef.current
    if (!map || !mapLoadedRef.current) return

    const waypoints = analysis.route.waypoints || []
    if (waypoints.length === 0) return

    console.log('[MapLibre] Updating route')

    // Convert waypoints into GeoJSON LineString using routeService.routeToGeoJSON()
    const lineGeometry = routeToGeoJSON(waypoints)
    const geojson = {
      type: 'Feature' as const,
      properties: {},
      geometry: lineGeometry,
    }

    const routeStatus = (analysis.route.status || 'GO') as 'GO' | 'CAUTION' | 'NO-GO'
    const statusStyle = getRouteStatusColor(routeStatus)

    if (map.getSource('route-line')) {
      (map.getSource('route-line') as maplibregl.GeoJSONSource).setData(geojson)
      if (map.getLayer('route-line-layer')) {
        map.setPaintProperty('route-line-layer', 'line-color', statusStyle.color)
        map.setPaintProperty('route-line-layer', 'line-width', statusStyle.width + 1.5)
      }
    } else {
      map.addSource('route-line', { type: 'geojson', data: geojson })
      map.addLayer({
        id: 'route-line-layer',
        type: 'line',
        source: 'route-line',
        paint: {
          'line-color': statusStyle.color,
          'line-width': statusStyle.width + 1.5,
          'line-opacity': statusStyle.opacity,
        },
      })
    }
  }, [analysis])

  // 3. Update markers and bounds when coordinates or analysis change
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    // Clear previous markers
    markersRef.current.forEach((m) => m.remove())
    markersRef.current = []

    if (!analysis || !analysis.route) return

    const waypoints = analysis.route.waypoints || []
    if (waypoints.length === 0) return

    // Add Origin Marker (Green)
    if (isFinite(originLon) && isFinite(originLat)) {
      const startMarker = new maplibregl.Marker({ color: '#10B981' })
        .setLngLat([originLon, originLat])
        .setPopup(new maplibregl.Popup().setHTML(`<b>Origin:</b> ${originName}`))
        .addTo(map)
      markersRef.current.push(startMarker)
    }

    // Add Destination Marker (Red)
    if (isFinite(destLon) && isFinite(destLat)) {
      const destMarker = new maplibregl.Marker({ color: '#EF4444' })
        .setLngLat([destLon, destLat])
        .setPopup(new maplibregl.Popup().setHTML(`<b>Destination:</b> ${destName}`))
        .addTo(map)
      markersRef.current.push(destMarker)
    }

    // Add Waypoints (Yellow)
    waypoints.slice(1, -1).forEach((pt, i) => {
      if (isFinite(pt[1]) && isFinite(pt[0])) {
        const wpMarker = new maplibregl.Marker({ color: '#F59E0B', scale: 0.7 })
          .setLngLat([pt[1], pt[0]])
          .setPopup(new maplibregl.Popup().setHTML(`<b>Waypoint ${i + 1}</b>`))
          .addTo(map)
        markersRef.current.push(wpMarker)
      }
    })

    // Fit map bounds to encompass origin, destination, and all waypoints
    const lineGeometry = routeToGeoJSON(waypoints)
    const bounds = new maplibregl.LngLatBounds()
    let validCoords = 0
    lineGeometry.coordinates.forEach((coord) => {
      const [lng, lat] = coord as [number, number]
      if (isFinite(lng) && isFinite(lat) && lng >= -180 && lng <= 180 && lat >= -90 && lat <= 90) {
        bounds.extend([lng, lat])
        validCoords++
      }
    })

    if (validCoords >= 2 && map.loaded()) {
      try {
        map.fitBounds(bounds, { padding: 50, maxZoom: 12 })
      } catch (err) {
        console.warn('[MapLibre] fitBounds error:', err)
      }
    } else if (validCoords >= 2 && !map.loaded()) {
      // If map isn't loaded yet, try to fit once it loads
      map.once('load', () => {
        try {
          map.fitBounds(bounds, { padding: 50, maxZoom: 12 })
        } catch (err) {
          console.warn('[MapLibre] fitBounds error (deferred):', err)
        }
      })
    }
  }, [analysis, originLat, originLon, originName, destLat, destLon, destName])

  // GPS trigger
  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert(t('location.geoNotSupported'))
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setOriginLat(parseFloat(pos.coords.latitude.toFixed(4)))
        setOriginLon(parseFloat(pos.coords.longitude.toFixed(4)))
        setOriginName('Current GPS Location')
      },
      (err) => {
        alert(`${t('location.permissionDenied')}: ${err.message}`)
      }
    )
  }

  // Validate inputs
  const validateForm = () => {
    const errs: Record<string, string> = {}
    if (!originName.trim()) errs.originName = 'Origin location name is required.'
    if (isNaN(originLat) || originLat < -90 || originLat > 90) errs.originLat = 'Latitude must be between -90 and 90.'
    if (isNaN(originLon) || originLon < -180 || originLon > 180) errs.originLon = 'Longitude must be between -180 and 180.'

    if (!destName.trim()) errs.destName = 'Destination location name is required.'
    if (isNaN(destLat) || destLat < -90 || destLat > 90) errs.destLat = 'Latitude must be between -90 and 90.'
    if (isNaN(destLon) || destLon < -180 || destLon > 180) errs.destLon = 'Longitude must be between -180 and 180.'

    if (Math.abs(originLat - destLat) < 0.0001 && Math.abs(originLon - destLon) < 0.0001) {
      errs.destName = 'Origin and destination coordinates must be different.'
    }

    setValidationErrors(errs)
    return Object.keys(errs).length === 0
  }

  // Submit Handler
  const handleAnalyzeTrip = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()

    const stack = new Error().stack || '';
    const exactCaller = stack.split('\n')[2] || 'unknown';
    const reqNum = ++requestCountRef.current;
    console.log(`[TripPlanner] handleAnalyzeTrip entry #${reqNum}. Event: ${e?.type || 'none'}. Caller: ${exactCaller.trim()}`);

    if (!validateForm()) return
    
    // Prevent duplicate concurrent requests
    if (loading) {
      console.log(`[TripPlanner] analyzeTrip blocked request #${reqNum} because loading=true`);
      return
    }

    setLoading(true)
    setError(null)
    const currentId = reqNum

    try {
      const payload = {
        originLat,
        originLon,
        originName,
        destLat,
        destLon,
        destName,
        departureDate,
        departureTime,
        boatKey,
        purpose,
      }
      console.log('[TripPlanner] Analyze payload:', payload);

      const res = await analyzeTrip(payload)

      const response = res ? { data: res } : null;
      console.log('[TripPlanner] Analyze response:', response);
      console.log('[TripPlanner] Route result:', response?.data?.route);

      // If a newer request was initiated, ignore this stale response
      if (currentId !== requestCountRef.current) return

      if (!res) {
        throw new Error('Failed to obtain trip analysis from backend.')
      }

      setAnalysis(res)
    } catch (err: any) {
      if (currentId === requestCountRef.current) {
        console.error('Trip analysis error:', err)
        setError(err.message || 'An error occurred during trip planning.')
      }
    } finally {
      if (currentId === requestCountRef.current) {
        setLoading(false)
      }
    }
  }

  return (
    <div className="page-shell">
      <div className="page-header">
        <div>
          <h1 className="page-title">🧭 {t('tripPlanner.title')}</h1>
          <p className="page-subtitle">{t('tripPlanner.subtitle')}</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {loading && (
            <div style={{ fontSize: 12, color: 'rgba(126,200,227,0.8)', padding: '6px 14px', borderRadius: 99, background: 'rgba(30,95,168,0.2)', border: '1px solid rgba(30,95,168,0.3)' }}>
              ⏳ {t('tripPlanner.analyzingRoute')}
            </div>
          )}
          {analysis && (
            <div style={{ fontSize: 12, color: analysis.geospatial.isMockData ? 'rgba(251,191,36,0.8)' : 'rgba(16,185,129,0.8)', padding: '6px 14px', borderRadius: 99, background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)' }}>
              {analysis.geospatial.isMockData ? `⚠️ ${t('tripPlanner.demoData')}` : `✅ ${t('tripPlanner.livePostgisData')}`}
            </div>
          )}
        </div>
      </div>

      {error && (
        <div style={{ padding: '12px 16px', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 12, color: '#f87171', fontSize: 13.5 }}>
          ⚠️ <b>{t('tripPlanner.tripPlanningError')}</b> {error}
        </div>
      )}

      {/* Preset Buttons */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>{t('tripPlanner.quickPresets')}</span>
        {PRESET_ROUTES.map((p) => (
          <button
            key={p.name}
            onClick={() => {
              setOriginName(p.origin.name)
              setOriginLat(p.origin.lat)
              setOriginLon(p.origin.lon)
              setDestName(p.dest.name)
              setDestLat(p.dest.lat)
              setDestLon(p.dest.lon)
            }}
            style={{ padding: '4px 12px', borderRadius: 99, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', fontSize: 12, cursor: 'pointer' }}
          >
            {p.name}
          </button>
        ))}
      </div>

      {/* Inputs Form */}
      <form onSubmit={handleAnalyzeTrip} className="glass-card" style={{ padding: 24, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
        {/* Origin Name & GPS */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <label style={{ fontSize: 12, color: 'rgba(184,223,240,0.8)', fontWeight: 600 }}>{t('tripPlanner.startLocation')}</label>
            <button
              type="button"
              onClick={handleUseCurrentLocation}
              style={{ fontSize: 11, background: 'none', border: 'none', color: 'var(--accent-blue)', cursor: 'pointer', fontWeight: 600 }}
            >
              📍 {t('tripPlanner.useGps')}
            </button>
          </div>
          <input
            type="text"
            value={originName}
            onChange={(e) => setOriginName(e.target.value)}
            placeholder="e.g. Chennai Harbour"
            style={{ width: '100%', padding: '10px 12px', background: 'rgba(0,0,0,0.3)', border: validationErrors.originName ? '1px solid #ef4444' : '1px solid rgba(255,255,255,0.2)', borderRadius: 10, color: '#fff', fontSize: 13.5 }}
          />
          {validationErrors.originName && <div style={{ color: '#ef4444', fontSize: 11, marginTop: 4 }}>{validationErrors.originName}</div>}
        </div>

        {/* Origin Coordinates */}
        <div>
          <label style={{ fontSize: 12, color: 'rgba(184,223,240,0.8)', fontWeight: 600, display: 'block', marginBottom: 6 }}>{t('tripPlanner.startLatLon')}</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <input
              type="number"
              step="0.0001"
              value={originLat}
              onChange={(e) => setOriginLat(parseFloat(e.target.value))}
              placeholder="Lat"
              style={{ width: '100%', padding: '10px 10px', background: 'rgba(0,0,0,0.3)', border: validationErrors.originLat ? '1px solid #ef4444' : '1px solid rgba(255,255,255,0.2)', borderRadius: 10, color: '#fff', fontSize: 13 }}
            />
            <input
              type="number"
              step="0.0001"
              value={originLon}
              onChange={(e) => setOriginLon(parseFloat(e.target.value))}
              placeholder="Lon"
              style={{ width: '100%', padding: '10px 10px', background: 'rgba(0,0,0,0.3)', border: validationErrors.originLon ? '1px solid #ef4444' : '1px solid rgba(255,255,255,0.2)', borderRadius: 10, color: '#fff', fontSize: 13 }}
            />
          </div>
          {(validationErrors.originLat || validationErrors.originLon) && (
            <div style={{ color: '#ef4444', fontSize: 11, marginTop: 4 }}>{validationErrors.originLat || validationErrors.originLon}</div>
          )}
        </div>

        {/* Destination Name */}
        <div>
          <label style={{ fontSize: 12, color: 'rgba(184,223,240,0.8)', fontWeight: 600, display: 'block', marginBottom: 6 }}>{t('tripPlanner.destinationName')}</label>
          <input
            type="text"
            value={destName}
            onChange={(e) => setDestName(e.target.value)}
            placeholder="e.g. Puducherry Port"
            style={{ width: '100%', padding: '10px 12px', background: 'rgba(0,0,0,0.3)', border: validationErrors.destName ? '1px solid #ef4444' : '1px solid rgba(255,255,255,0.2)', borderRadius: 10, color: '#fff', fontSize: 13.5 }}
          />
          {validationErrors.destName && <div style={{ color: '#ef4444', fontSize: 11, marginTop: 4 }}>{validationErrors.destName}</div>}
        </div>

        {/* Destination Coordinates */}
        <div>
          <label style={{ fontSize: 12, color: 'rgba(184,223,240,0.8)', fontWeight: 600, display: 'block', marginBottom: 6 }}>{t('tripPlanner.destLatLon')}</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <input
              type="number"
              step="0.0001"
              value={destLat}
              onChange={(e) => setDestLat(parseFloat(e.target.value))}
              placeholder="Lat"
              style={{ width: '100%', padding: '10px 10px', background: 'rgba(0,0,0,0.3)', border: validationErrors.destLat ? '1px solid #ef4444' : '1px solid rgba(255,255,255,0.2)', borderRadius: 10, color: '#fff', fontSize: 13 }}
            />
            <input
              type="number"
              step="0.0001"
              value={destLon}
              onChange={(e) => setDestLon(parseFloat(e.target.value))}
              placeholder="Lon"
              style={{ width: '100%', padding: '10px 10px', background: 'rgba(0,0,0,0.3)', border: validationErrors.destLon ? '1px solid #ef4444' : '1px solid rgba(255,255,255,0.2)', borderRadius: 10, color: '#fff', fontSize: 13 }}
            />
          </div>
          {(validationErrors.destLat || validationErrors.destLon) && (
            <div style={{ color: '#ef4444', fontSize: 11, marginTop: 4 }}>{validationErrors.destLat || validationErrors.destLon}</div>
          )}
        </div>

        {/* Departure Date & Time */}
        <div>
          <label style={{ fontSize: 12, color: 'rgba(184,223,240,0.8)', fontWeight: 600, display: 'block', marginBottom: 6 }}>{t('tripPlanner.departureDateTime')}</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <input
              type="date"
              value={departureDate}
              onChange={(e) => setDepartureDate(e.target.value)}
              style={{ width: '100%', padding: '10px 8px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 10, color: '#fff', fontSize: 13 }}
            />
            <input
              type="time"
              value={departureTime}
              onChange={(e) => setDepartureTime(e.target.value)}
              style={{ width: '100%', padding: '10px 8px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 10, color: '#fff', fontSize: 13 }}
            />
          </div>
        </div>

        {/* Vessel Profile */}
        <div>
          <label style={{ fontSize: 12, color: 'rgba(184,223,240,0.8)', fontWeight: 600, display: 'block', marginBottom: 6 }}>{t('tripPlanner.boatProfile')}</label>
          <select
            value={boatKey}
            onChange={(e) => setBoatKey(e.target.value as 'small' | 'mechanized')}
            style={{ width: '100%', padding: '10px 12px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 10, color: '#fff', fontSize: 13.5 }}
          >
            <option value="small" style={{ background: '#1e293b' }}>{t('tripPlanner.smallBoat')}</option>
            <option value="mechanized" style={{ background: '#1e293b' }}>{t('tripPlanner.mechanizedBoat')}</option>
          </select>
        </div>

        {/* Trip Purpose & Submit Button */}
        <div style={{ gridColumn: '1 / -1', display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <label style={{ fontSize: 12, color: 'rgba(184,223,240,0.8)', fontWeight: 600 }}>{t('tripPlanner.tripPurpose')}</label>
            {[
              { id: 'Fishing', label: t('tripPlanner.fishing') },
              { id: 'Research', label: t('tripPlanner.research') },
              { id: 'Transport', label: t('tripPlanner.transport') },
              { id: 'General', label: t('tripPlanner.general') },
            ].map((p) => (
              <label key={p.id} style={{ fontSize: 13, color: '#fff', display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="purpose"
                  checked={purpose === p.id}
                  onChange={() => setPurpose(p.id)}
                />
                {p.label}
              </label>
            ))}
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              padding: '12px 28px',
              borderRadius: 12,
              background: 'var(--accent-blue)',
              color: '#fff',
              fontWeight: 700,
              fontSize: 14,
              border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 16px rgba(90,138,242,0.4)',
              transition: 'transform 0.2s',
            }}
          >
            {loading ? `⏳ ${t('tripPlanner.calculatingRoute')}` : `🚀 ${t('tripPlanner.analyzeTripRoute')}`}
          </button>
        </div>
      </form>

      {/* Interactive Route Map */}
      <div className="glass-card" style={{ padding: 16, position: 'relative', height: 500, minHeight: 500, flexShrink: 0, width: '100%', borderRadius: 20, overflow: 'hidden' }}>
        <div ref={mapContainer} style={{ width: '100%', height: '100%', borderRadius: 12 }} />
        {!analysis && (
          <div style={{ position: 'absolute', top: 32, left: 32, zIndex: 10, background: 'rgba(10,20,30,0.85)', padding: '10px 16px', borderRadius: 8, color: '#e0f0ff', fontSize: 13 }}>
            📍 {t('tripPlanner.mapInstruction')}
          </div>
        )}
      </div>

      {/* Results View */}
      {analysis && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
          {/* Status Banner */}
          <div className="glass-card" style={{ gridColumn: '1 / -1', padding: 24, borderLeft: `6px solid ${analysis.risk.overallStatus === 'NO_GO' ? '#EF4444' : analysis.risk.overallStatus === 'CAUTION' ? '#F59E0B' : '#10B981'}` }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
              <div>
                <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.6)', fontWeight: 700 }}>
                  {t('tripPlanner.tripSafetyAssessment')}
                </div>
                <h2 style={{ fontSize: 24, fontWeight: 800, marginTop: 4 }}>
                  {analysis.tripSummary.originName} → {analysis.tripSummary.destName}
                </h2>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 4 }}>
                  {t('tripPlanner.departure')} <b>{analysis.tripSummary.departureDate} {t('tripPlanner.at')} {analysis.tripSummary.departureTime}</b> · {t('tripPlanner.vessel')} <b>{analysis.tripSummary.boatLabel}</b>
                </div>
              </div>

              <div style={{
                padding: '10px 24px',
                borderRadius: 99,
                fontWeight: 800,
                fontSize: 18,
                letterSpacing: '0.05em',
                background: analysis.risk.overallStatus === 'NO_GO' ? 'rgba(239,68,68,0.2)' : analysis.risk.overallStatus === 'CAUTION' ? 'rgba(245,158,11,0.2)' : 'rgba(16,185,129,0.2)',
                color: analysis.risk.overallStatus === 'NO_GO' ? '#f87171' : analysis.risk.overallStatus === 'CAUTION' ? '#fbbf24' : '#34d399',
                border: `1px solid ${analysis.risk.overallStatus === 'NO_GO' ? 'rgba(239,68,68,0.4)' : analysis.risk.overallStatus === 'CAUTION' ? 'rgba(245,158,11,0.4)' : 'rgba(16,185,129,0.4)'}`,
              }}>
                {analysis.risk.overallStatus === 'NO_GO' ? t('risk.noGoLabel') : analysis.risk.overallStatus === 'CAUTION' ? t('risk.cautionLabel') : t('risk.goLabel')}
              </div>
            </div>
          </div>

          {/* Route Summary */}
          <div className="glass-card" style={{ padding: 20 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
              🧭 {t('tripPlanner.routeAnalysis')}
            </h3>
            {analysis.route && analysis.route.success ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="evidence-item">
                  <div className="evidence-label">{t('tripPlanner.routeDistance')}</div>
                  <div className="evidence-value">{analysis.route.distanceKm} km</div>
                  <div className="evidence-meta">{t('tripPlanner.straight')} {analysis.route.straightLineDistanceKm} km</div>
                </div>
                <div className="evidence-item">
                  <div className="evidence-label">{t('tripPlanner.estTravelTime')}</div>
                  <div className="evidence-value">{Math.floor(analysis.route.travelTimeMinutes / 60)}h {analysis.route.travelTimeMinutes % 60}m</div>
                  <div className="evidence-meta">{analysis.route.travelTimeMinutes} {t('tripPlanner.mins')}</div>
                </div>
                <div className="evidence-item">
                  <div className="evidence-label">{t('tripPlanner.waypoints')}</div>
                  <div className="evidence-value">{analysis.route.waypoints.length} {t('tripPlanner.nodes')}</div>
                  <div className="evidence-meta">A* Weather Grid</div>
                </div>
                <div className="evidence-item">
                  <div className="evidence-label">{t('tripPlanner.hazardsAvoided')}</div>
                  <div className="evidence-value">{analysis.route.blockedNodesEncountered} {t('tripPlanner.nodes')}</div>
                  <div className="evidence-meta">{analysis.route.restrictedZonesAvoided.length} {t('tripPlanner.zones')}</div>
                </div>
              </div>
            ) : (
              <div style={{ color: 'var(--status-nogo)', fontSize: 13, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <span>⚠️ {t('tripPlanner.routeFailed')}</span>
                {analysis.route && (
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>{t('tripPlanner.straight')} <b>{analysis.route.straightLineDistanceKm} km</b></span>
                )}
              </div>
            )}
          </div>

          {/* Weather Conditions */}
          <div className="glass-card" style={{ padding: 20 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
              🌤 {t('tripPlanner.weatherConditions')}
            </h3>
            {analysis.weather ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="evidence-item">
                  <div className="evidence-label">{t('tripPlanner.temperature')}</div>
                  <div className="evidence-value">{analysis.weather.temperature}°C</div>
                  <div className="evidence-meta">{t('tripPlanner.feelsLike')} {analysis.weather.feelsLike}°C</div>
                </div>
                <div className="evidence-item">
                  <div className="evidence-label">{t('tripPlanner.windSpeed')}</div>
                  <div className="evidence-value">{analysis.weather.windSpeed} km/h</div>
                  <div className="evidence-meta">{t('tripPlanner.dir')} {analysis.weather.windDirection}</div>
                </div>
                <div className="evidence-item">
                  <div className="evidence-label">{t('tripPlanner.condition')}</div>
                  <div className="evidence-value">{analysis.weather.condition}</div>
                  <div className="evidence-meta">{t('tripPlanner.humidity')} {analysis.weather.humidity}%</div>
                </div>
                <div className="evidence-item">
                  <div className="evidence-label">{t('tripPlanner.rainRisk')}</div>
                  <div className="evidence-value">{analysis.weather.rainProbability}%</div>
                  <div className="evidence-meta">{t('tripPlanner.vis')} {(analysis.weather.visibility / 1000).toFixed(1)} km</div>
                </div>
              </div>
            ) : (
              <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13 }}>{t('tripPlanner.weatherLoading')}</div>
            )}
          </div>

          {/* Ocean Conditions */}
          <div className="glass-card" style={{ padding: 20 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
              🌊 {t('tripPlanner.oceanConditions')}
            </h3>
            {analysis.ocean ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="evidence-item">
                  <div className="evidence-label">{t('tripPlanner.waveHeight')}</div>
                  <div className="evidence-value">{analysis.ocean.waveHeight ?? '—'} m</div>
                  <div className="evidence-meta">{t('tripPlanner.dir')} {analysis.ocean.waveDirection ? `${analysis.ocean.waveDirection}°` : 'SE'}</div>
                </div>
                <div className="evidence-item">
                  <div className="evidence-label">{t('tripPlanner.swellPeriod')}</div>
                  <div className="evidence-value">{analysis.ocean.swellPeriod ?? '—'} s</div>
                  <div className="evidence-meta">{t('tripPlanner.dir')} {analysis.ocean.swellDirection ?? '—'}</div>
                </div>
                <div className="evidence-item">
                  <div className="evidence-label">{t('tripPlanner.seaState')}</div>
                  <div className="evidence-value">{analysis.ocean.seaState ?? 'Moderate'}</div>
                  <div className="evidence-meta">{t('tripPlanner.sst')} {analysis.ocean.sst ? `${analysis.ocean.sst}°C` : '—'}</div>
                </div>
                <div className="evidence-item">
                  <div className="evidence-label">{t('tripPlanner.currentSpeed')}</div>
                  <div className="evidence-value">{analysis.ocean.currentSpeed ?? 0.8} km/h</div>
                  <div className="evidence-meta">{t('tripPlanner.dir')} {analysis.ocean.currentDirection ?? 'NNE'}</div>
                </div>
              </div>
            ) : (
              <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13 }}>{t('tripPlanner.oceanLoading')}</div>
            )}
          </div>

          {/* Geospatial Safety */}
          <div className="glass-card" style={{ padding: 20 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
              📐 {t('tripPlanner.geospatialSafety')}
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="evidence-item">
                <div className="evidence-label">{t('tripPlanner.boundaryClearance')}</div>
                <div className="evidence-value">{analysis.geospatial.distanceToBoundaryNm} nm</div>
                <div className="evidence-meta">{analysis.geospatial.distanceToBoundaryNm < 60 ? `⚠️ ${t('tripPlanner.boundaryProximity')}` : `✅ ${t('tripPlanner.clear')}`}</div>
              </div>
              <div className="evidence-item">
                <div className="evidence-label">{t('tripPlanner.nearestFishingZone')}</div>
                <div className="evidence-value">{analysis.geospatial.nearestFishingZoneKm > 0 ? `${analysis.geospatial.nearestFishingZoneKm} km` : 'N/A'}</div>
                <div className="evidence-meta">{t('tripPlanner.potentialFishingZone')}</div>
              </div>
              <div className="evidence-item" style={{ gridColumn: '1 / -1' }}>
                <div className="evidence-label">{t('tripPlanner.dataProvider')}</div>
                <div className="evidence-value" style={{ fontSize: 13 }}>{analysis.geospatial.dataSource}</div>
                <div className="evidence-meta">{t('tripPlanner.restrictedZonesIntersected')} {analysis.geospatial.routeAnalysis?.restrictedZonesOnRoute?.length || 0}</div>
              </div>
            </div>
          </div>

          {/* Safety Recommendation & Reasons */}
          <div className="glass-card" style={{ gridColumn: '1 / -1', padding: 20 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              🛡 {t('tripPlanner.safetyGuidance')}
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {analysis.risk.reasons.map((reason, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 13.5, color: 'rgba(255,255,255,0.9)' }}>
                  <span style={{ color: analysis.risk.overallStatus === 'NO_GO' ? '#EF4444' : analysis.risk.overallStatus === 'CAUTION' ? '#F59E0B' : '#10B981', fontWeight: 800 }}>•</span>
                  <span>{reason}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

