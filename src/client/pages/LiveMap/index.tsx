import { useEffect, useRef, useState } from 'react'
import * as maplibregl from 'maplibre-gl' 
import 'maplibre-gl/dist/maplibre-gl.css'
import { useTranslation } from '../../locales'
import { useAppStore } from '../../store'
import { ChevronRight, ChevronLeft, Map, Anchor } from 'lucide-react'

type LayerState = {
  gps: boolean
  ports: boolean
  safeRoutes: boolean
  caution: boolean
  fishingZones: boolean
  boundaries: boolean
  weather: boolean
  waves: boolean
  wind: boolean
  alerts: boolean
  cyclones: boolean
}

type ProviderStatus = {
  name: string
  status: 'LIVE DATA' | 'OFFLINE' | 'NO DATA'
  updated: string
  featureCount?: number
}

export default function LiveMapPage() {
  const { t } = useTranslation()
  const mapContainer = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const markerRef = useRef<maplibregl.Marker | null>(null)
  const clickMarkerRef = useRef<maplibregl.Marker | null>(null)
  
  const user = useAppStore(state => state.user)
  const setLocation = useAppStore(state => state.setLocation)
  
  const [info, setInfo] = useState<{ 
    clickedLat?: number; 
    clickedLon?: number; 
    distanceToBoundaryNm?: number; 
    nearestFishingZoneKm?: number;
    distanceFromUserKm?: number;
  } | null>(null)
  
  const [legendOpen, setLegendOpen] = useState(true)
  
  const [layers, setLayers] = useState<LayerState>({
    gps: true,
    ports: true,
    safeRoutes: true,
    caution: true,
    fishingZones: true,
    boundaries: true,
    weather: true,
    waves: true,
    wind: true,
    alerts: true,
    cyclones: true
  })

  const [providerStatuses, setProviderStatuses] = useState<Record<string, ProviderStatus>>({
    geospatial: { name: 'PostGIS Boundaries & PFZ', status: 'NO DATA', updated: '--' },
    ports: { name: 'Major Marine Ports', status: 'NO DATA', updated: '--' },
    weather: { name: 'Open-Meteo Weather API', status: 'NO DATA', updated: '--' },
    marine: { name: 'Open-Meteo Marine API', status: 'NO DATA', updated: '--' },
    alerts: { name: 'Real Marine Alerts Feed', status: 'NO DATA', updated: '--' },
  })

  // Try fetching browser geolocation if store location is missing
  useEffect(() => {
    if (!user.location && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLocation(pos.coords.latitude, pos.coords.longitude, 'Current Location')
        },
        (err) => console.warn('Geolocation error or permission denied:', err.message),
        { enableHighAccuracy: true, timeout: 10000 }
      )
    }
  }, [user.location, setLocation])

  // Update map layer visibility dynamically
  useEffect(() => {
    if (!mapRef.current) return
    const map = mapRef.current

    const setVisibility = (layerId: string, visible: boolean) => {
      if (map.getLayer(layerId)) {
        map.setLayoutProperty(layerId, 'visibility', visible ? 'visible' : 'none')
      }
    }

    setVisibility('user-location-circle', layers.gps)
    setVisibility('ports-circle', layers.ports)
    setVisibility('ports-label', layers.ports)
    setVisibility('safe-routes-line', layers.safeRoutes)
    setVisibility('restricted-zones-fill', layers.caution)
    setVisibility('restricted-zones-outline', layers.caution)
    setVisibility('fishing-zones-fill', layers.fishingZones)
    setVisibility('fishing-zones-outline', layers.fishingZones)
    setVisibility('boundaries-line', layers.boundaries)
    setVisibility('weather-circle', layers.weather)
    setVisibility('weather-label', layers.weather)
    setVisibility('waves-circle', layers.waves)
    setVisibility('waves-label', layers.waves)
    setVisibility('wind-circle', layers.wind)
    setVisibility('wind-label', layers.wind)
    setVisibility('alerts-fill', layers.alerts)
    setVisibility('alerts-outline', layers.alerts)
    setVisibility('cyclones-circle', layers.cyclones)
    setVisibility('cyclones-label', layers.cyclones)

    // GPS marker visibility
    if (markerRef.current) {
      if (layers.gps && user.location) {
        markerRef.current.setLngLat([user.location.lon, user.location.lat])
        markerRef.current.addTo(map)
      } else {
        markerRef.current.remove()
      }
    }
  }, [layers, user.location])

  // Initialize Map & Load Real Layers
  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return

    const initialLat = user.location?.lat ?? 13.0827
    const initialLon = user.location?.lon ?? 80.2707

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: 'https://tiles.openfreemap.org/styles/liberty',
      center: [initialLon, initialLat],
      zoom: 6,
    })
    mapRef.current = map

    markerRef.current = new maplibregl.Marker({ color: '#2ecc71' })
    if (user.location) {
      markerRef.current.setLngLat([user.location.lon, user.location.lat]).addTo(map)
    }

    map.on('load', async () => {
      const curTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

      // 1. Fetch PostGIS Features & Ports
      try {
        const res = await fetch(`/api/geospatial/features?lat=${initialLat}&lon=${initialLon}`)
        const data = await res.json()

        setProviderStatuses(prev => ({
          ...prev,
          geospatial: { name: 'PostGIS Boundaries & PFZ', status: 'LIVE DATA', updated: curTime, featureCount: (data.boundaries?.length || 0) + (data.fishingZones?.length || 0) },
          ports: { name: 'Major Marine Ports', status: 'LIVE DATA', updated: curTime, featureCount: data.ports?.length || 0 }
        }))

        // User location pulse circle source
        map.addSource('user-location', {
          type: 'geojson',
          data: {
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [initialLon, initialLat] },
            properties: {}
          }
        })
        map.addLayer({
          id: 'user-location-circle',
          type: 'circle',
          source: 'user-location',
          paint: {
            'circle-radius': 12,
            'circle-color': '#2ecc71',
            'circle-opacity': 0.4,
            'circle-stroke-width': 2,
            'circle-stroke-color': '#ffffff'
          },
          layout: { visibility: layers.gps ? 'visible' : 'none' }
        })

        // EEZ Boundaries
        if (data.boundaries && data.boundaries.length > 0) {
          map.addSource('boundaries', { type: 'geojson', data: { type: 'FeatureCollection', features: data.boundaries } })
          map.addLayer({
            id: 'boundaries-line',
            type: 'line',
            source: 'boundaries',
            paint: { 'line-color': '#ff3b30', 'line-width': 2.5, 'line-dasharray': [3, 2] },
            layout: { visibility: layers.boundaries ? 'visible' : 'none' }
          })
        }

        // Fishing Zones (PFZ)
        if (data.fishingZones && data.fishingZones.length > 0) {
          map.addSource('fishing-zones', { type: 'geojson', data: { type: 'FeatureCollection', features: data.fishingZones } })
          map.addLayer({
            id: 'fishing-zones-fill',
            type: 'fill',
            source: 'fishing-zones',
            paint: { 'fill-color': '#00b4d8', 'fill-opacity': 0.35 },
            layout: { visibility: layers.fishingZones ? 'visible' : 'none' }
          })
          map.addLayer({
            id: 'fishing-zones-outline',
            type: 'line',
            source: 'fishing-zones',
            paint: { 'line-color': '#0096c7', 'line-width': 2 },
            layout: { visibility: layers.fishingZones ? 'visible' : 'none' }
          })
        }

        // Ports & Harbours
        if (data.ports && data.ports.length > 0) {
          map.addSource('ports', { type: 'geojson', data: { type: 'FeatureCollection', features: data.ports } })
          map.addLayer({
            id: 'ports-circle',
            type: 'circle',
            source: 'ports',
            paint: { 'circle-radius': 7, 'circle-color': '#3a86ff', 'circle-stroke-width': 2, 'circle-stroke-color': '#ffffff' },
            layout: { visibility: layers.ports ? 'visible' : 'none' }
          })
          map.addLayer({
            id: 'ports-label',
            type: 'symbol',
            source: 'ports',
            layout: {
              'text-field': ['get', 'name'],
              'text-size': 11,
              'text-offset': [0, 1.2],
              'text-anchor': 'top',
              visibility: layers.ports ? 'visible' : 'none'
            },
            paint: { 'text-color': '#ffffff', 'text-halo-color': '#000000', 'text-halo-width': 1 }
          })
        }

        // Restricted Zones
        if (data.restrictedZones && data.restrictedZones.length > 0) {
          map.addSource('restricted-zones', { type: 'geojson', data: { type: 'FeatureCollection', features: data.restrictedZones } })
          map.addLayer({
            id: 'restricted-zones-fill',
            type: 'fill',
            source: 'restricted-zones',
            paint: { 'fill-color': '#ff9f0a', 'fill-opacity': 0.35 },
            layout: { visibility: layers.caution ? 'visible' : 'none' }
          })
          map.addLayer({
            id: 'restricted-zones-outline',
            type: 'line',
            source: 'restricted-zones',
            paint: { 'line-color': '#ff9f0a', 'line-width': 2, 'line-dasharray': [4, 2] },
            layout: { visibility: layers.caution ? 'visible' : 'none' }
          })
        }

      } catch (err) {
        console.error('Failed to load geospatial features:', err)
        setProviderStatuses(prev => ({
          ...prev,
          geospatial: { name: 'PostGIS Boundaries & PFZ', status: 'OFFLINE', updated: curTime }
        }))
      }

      // 2. Fetch Live Ocean, Weather, Alerts & Safe Routes
      try {
        const res = await fetch(`/api/geospatial/live-layers?lat=${initialLat}&lon=${initialLon}`)
        const data = await res.json()

        if (data.ok && data.layers) {
          const l = data.layers

          setProviderStatuses(prev => ({
            ...prev,
            weather: { name: 'Open-Meteo Weather API', status: l.weather.status, updated: curTime },
            marine: { name: 'Open-Meteo Marine API', status: l.waves.status, updated: curTime },
            alerts: { name: 'Real Marine Alerts Feed', status: l.alerts.status, updated: curTime }
          }))

          // Weather layer
          if (l.weather.features && l.weather.features.length > 0) {
            map.addSource('weather', { type: 'geojson', data: { type: 'FeatureCollection', features: l.weather.features } })
            map.addLayer({
              id: 'weather-circle',
              type: 'circle',
              source: 'weather',
              paint: { 'circle-radius': 9, 'circle-color': '#ffb703', 'circle-stroke-width': 2, 'circle-stroke-color': '#ffffff' },
              layout: { visibility: layers.weather ? 'visible' : 'none' }
            })
            map.addLayer({
              id: 'weather-label',
              type: 'symbol',
              source: 'weather',
              layout: {
                'text-field': ['concat', ['to-string', ['get', 'temperature']], '°C ', ['get', 'condition']],
                'text-size': 11,
                'text-offset': [0, 1.4],
                'text-anchor': 'top',
                visibility: layers.weather ? 'visible' : 'none'
              },
              paint: { 'text-color': '#ffb703', 'text-halo-color': '#000000', 'text-halo-width': 1 }
            })
          }

          // Waves layer
          if (l.waves.features && l.waves.features.length > 0) {
            map.addSource('waves', { type: 'geojson', data: { type: 'FeatureCollection', features: l.waves.features } })
            map.addLayer({
              id: 'waves-circle',
              type: 'circle',
              source: 'waves',
              paint: { 'circle-radius': 10, 'circle-color': '#48cae4', 'circle-stroke-width': 2, 'circle-stroke-color': '#ffffff' },
              layout: { visibility: layers.waves ? 'visible' : 'none' }
            })
            map.addLayer({
              id: 'waves-label',
              type: 'symbol',
              source: 'waves',
              layout: {
                'text-field': ['concat', 'Wave ', ['to-string', ['get', 'waveHeight']], 'm (', ['get', 'seaState'], ')'],
                'text-size': 11,
                'text-offset': [0, -1.4],
                'text-anchor': 'bottom',
                visibility: layers.waves ? 'visible' : 'none'
              },
              paint: { 'text-color': '#48cae4', 'text-halo-color': '#000000', 'text-halo-width': 1 }
            })
          }

          // Wind & Currents layer
          if (l.wind.features && l.wind.features.length > 0) {
            map.addSource('wind', { type: 'geojson', data: { type: 'FeatureCollection', features: l.wind.features } })
            map.addLayer({
              id: 'wind-circle',
              type: 'circle',
              source: 'wind',
              paint: { 'circle-radius': 8, 'circle-color': '#9d4edd', 'circle-stroke-width': 2, 'circle-stroke-color': '#ffffff' },
              layout: { visibility: layers.wind ? 'visible' : 'none' }
            })
            map.addLayer({
              id: 'wind-label',
              type: 'symbol',
              source: 'wind',
              layout: {
                'text-field': ['concat', 'Wind ', ['to-string', ['get', 'windSpeed']], 'km/h ', ['get', 'windDirection']],
                'text-size': 11,
                'text-offset': [0, 1.4],
                'text-anchor': 'top',
                visibility: layers.wind ? 'visible' : 'none'
              },
              paint: { 'text-color': '#c77dff', 'text-halo-color': '#000000', 'text-halo-width': 1 }
            })
          }

          // Safe Routes layer
          if (l.safeRoutes.features && l.safeRoutes.features.length > 0) {
            map.addSource('safe-routes', { type: 'geojson', data: { type: 'FeatureCollection', features: l.safeRoutes.features } })
            map.addLayer({
              id: 'safe-routes-line',
              type: 'line',
              source: 'safe-routes',
              paint: { 'line-color': '#2ecc71', 'line-width': 4 },
              layout: { visibility: layers.safeRoutes ? 'visible' : 'none' }
            })
          }

          // Alerts layer
          if (l.alerts.features && l.alerts.features.length > 0) {
            map.addSource('alerts', { type: 'geojson', data: { type: 'FeatureCollection', features: l.alerts.features } })
            map.addLayer({
              id: 'alerts-fill',
              type: 'fill',
              source: 'alerts',
              paint: { 'fill-color': '#ff3b30', 'fill-opacity': 0.4 },
              layout: { visibility: layers.alerts ? 'visible' : 'none' }
            })
            map.addLayer({
              id: 'alerts-outline',
              type: 'line',
              source: 'alerts',
              paint: { 'line-color': '#ff3b30', 'line-width': 2.5 },
              layout: { visibility: layers.alerts ? 'visible' : 'none' }
            })
          }

          // Cyclones layer
          if (l.cyclones.features && l.cyclones.features.length > 0) {
            map.addSource('cyclones', { type: 'geojson', data: { type: 'FeatureCollection', features: l.cyclones.features } })
            map.addLayer({
              id: 'cyclones-circle',
              type: 'circle',
              source: 'cyclones',
              paint: { 'circle-radius': 14, 'circle-color': '#d90429', 'circle-opacity': 0.7, 'circle-stroke-width': 3, 'circle-stroke-color': '#ffffff' },
              layout: { visibility: layers.cyclones ? 'visible' : 'none' }
            })
            map.addLayer({
              id: 'cyclones-label',
              type: 'symbol',
              source: 'cyclones',
              layout: {
                'text-field': ['get', 'title'],
                'text-size': 12,
                'text-offset': [0, 1.5],
                'text-anchor': 'top',
                visibility: layers.cyclones ? 'visible' : 'none'
              },
              paint: { 'text-color': '#ff4d6d', 'text-halo-color': '#000000', 'text-halo-width': 1.5 }
            })
          }
        }
      } catch (err) {
        console.error('Failed to load live layers:', err)
      }
    })

    // Click on map to inspect location & calculate distance
    map.on('click', async (e) => {
      const { lng, lat } = e.lngLat

      if (clickMarkerRef.current) {
        clickMarkerRef.current.setLngLat([lng, lat])
      } else {
        clickMarkerRef.current = new maplibregl.Marker({ color: '#ffcc00' }).setLngLat([lng, lat]).addTo(map)
      }

      let distFromUser: number | undefined
      if (user.location) {
        const rad = Math.PI / 180
        const dLat = (lat - user.location.lat) * rad
        const dLon = (lng - user.location.lon) * rad
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                  Math.cos(user.location.lat * rad) * Math.cos(lat * rad) *
                  Math.sin(dLon / 2) * Math.sin(dLon / 2)
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
        distFromUser = Math.round(6371 * c)
      }

      try {
        const res = await fetch(`/api/geospatial?lat=${lat}&lon=${lng}`)
        const json = await res.json()
        setInfo({
          clickedLat: lat,
          clickedLon: lng,
          distanceToBoundaryNm: json.distanceToBoundaryNm,
          nearestFishingZoneKm: json.nearestFishingZoneKm,
          distanceFromUserKm: distFromUser
        })
      } catch (err) {
        console.error('Failed to fetch geospatial info:', err)
      }
    })

    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [user.location])

  const toggleLayer = (key: keyof LayerState) => {
    setLayers(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const centerMap = () => {
    if (user.location && mapRef.current) {
      mapRef.current.flyTo({ center: [user.location.lon, user.location.lat], zoom: 7 })
    }
  }

  return (
    <div className="page-shell" style={{ padding: 0, position: 'relative', flex: 1, height: '100%', overflow: 'hidden' }}>
      <div ref={mapContainer} style={{ position: 'absolute', inset: 0 }} />
      
      {/* Top Left Info Box */}
      <div style={{
        position: 'absolute', top: 16, left: 16, zIndex: 10,
        background: 'rgba(10,20,30,0.85)', color: '#e0f0ff', backdropFilter: 'blur(10px)',
        padding: '12px 16px', borderRadius: 10, fontFamily: 'Outfit, sans-serif', fontSize: 13,
        maxWidth: 280, border: '1px solid rgba(45,139,186,0.3)',
      }}>
        <div style={{ fontWeight: 700, marginBottom: 6 }}>🗺 {t('liveMap.title') || 'ORCA Live Marine Map'}</div>
        <div style={{ opacity: 0.7, marginBottom: 8 }}>{t('liveMap.instruction') || 'Click anywhere to query live boundary & marine features.'}</div>
        {info ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div>📍 Selected Location: <b>{info.clickedLat?.toFixed(2)}°, {info.clickedLon?.toFixed(2)}°</b></div>
            <div>📏 Distance from User: <b>{info.distanceFromUserKm ?? '--'} km</b></div>
            <div>📍 Distance to Boundary: <b>{info.distanceToBoundaryNm?.toFixed(1) ?? '--'} nm</b></div>
            <div>🐟 Nearest PFZ: <b>{info.nearestFishingZoneKm?.toFixed(1) ?? '--'} km</b></div>
          </div>
        ) : (
          <div style={{ fontSize: 11, opacity: 0.7 }}>User location: {user.location ? `${user.location.lat.toFixed(2)}°, ${user.location.lon.toFixed(2)}°` : 'Searching GPS...'}</div>
        )}
      </div>

      {/* Center Me Button */}
      {user.location && (
        <button 
          onClick={centerMap}
          style={{
            position: 'absolute', bottom: 24, right: legendOpen ? 320 : 24, zIndex: 10,
            background: 'rgba(45,139,186,0.9)', color: '#fff', border: 'none',
            padding: '10px 16px', borderRadius: 20, cursor: 'pointer',
            fontFamily: 'Outfit', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6,
            transition: 'right 0.3s ease', backdropFilter: 'blur(4px)'
          }}>
          <Map size={16} /> Center on Me
        </button>
      )}

      {/* Right Legend Panel */}
      <div style={{
        position: 'absolute', top: 16, right: legendOpen ? 16 : -280, bottom: 16, width: 280, zIndex: 20,
        background: 'rgba(10,20,30,0.85)', backdropFilter: 'blur(12px)',
        border: '1px solid rgba(45,139,186,0.3)', borderRadius: 12,
        transition: 'right 0.3s ease', display: 'flex', flexDirection: 'column',
        color: '#e0f0ff', fontFamily: 'Outfit, sans-serif'
      }}>
        
        {/* Toggle Button */}
        <button 
          onClick={() => setLegendOpen(!legendOpen)}
          style={{
            position: 'absolute', left: -32, top: 16, width: 32, height: 48,
            background: 'rgba(10,20,30,0.85)', border: '1px solid rgba(45,139,186,0.3)',
            borderRight: 'none', borderRadius: '8px 0 0 8px', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff'
          }}>
          {legendOpen ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </button>

        <div style={{ padding: '16px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Anchor size={18} /> MARINE MAP LEGEND
          </h2>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: 20 }}>
          
          {/* LIVE DATA STATUS */}
          <section>
            <h3 style={{ fontSize: 11, textTransform: 'uppercase', color: '#8892b0', margin: '0 0 10px 0', letterSpacing: 1 }}>Live Data Status</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {Object.entries(providerStatuses).map(([key, p]) => (
                <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12 }}>
                  <span style={{ fontSize: 11 }}>{p.name}</span>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ 
                      color: p.status === 'LIVE DATA' ? '#2ecc71' : p.status === 'NO DATA' ? '#f39c12' : '#e74c3c',
                      fontWeight: 600, fontSize: 10, padding: '2px 6px', borderRadius: 4,
                      background: p.status === 'LIVE DATA' ? 'rgba(46,204,113,0.15)' : 'rgba(231,76,60,0.15)'
                    }}>
                      {p.status}
                    </span>
                    <div style={{ fontSize: 9, opacity: 0.6, marginTop: 2 }}>{p.updated}</div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* MAP LAYERS (ALL 11 LAYERS) */}
          <section>
            <h3 style={{ fontSize: 11, textTransform: 'uppercase', color: '#8892b0', margin: '0 0 10px 0', letterSpacing: 1 }}>Map Layers</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input type="checkbox" checked={layers.gps} onChange={() => toggleLayer('gps')} />
                Live GPS Location
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input type="checkbox" checked={layers.ports} onChange={() => toggleLayer('ports')} />
                Ports & Harbours
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input type="checkbox" checked={layers.safeRoutes} onChange={() => toggleLayer('safeRoutes')} />
                Safe Navigation Routes
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input type="checkbox" checked={layers.caution} onChange={() => toggleLayer('caution')} />
                Caution / Restricted Areas
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input type="checkbox" checked={layers.fishingZones} onChange={() => toggleLayer('fishingZones')} />
                Fishing Zones / PFZ
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input type="checkbox" checked={layers.boundaries} onChange={() => toggleLayer('boundaries')} />
                EEZ / Maritime Boundaries
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input type="checkbox" checked={layers.weather} onChange={() => toggleLayer('weather')} />
                Live Weather Conditions
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input type="checkbox" checked={layers.waves} onChange={() => toggleLayer('waves')} />
                Waves & Sea State
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input type="checkbox" checked={layers.wind} onChange={() => toggleLayer('wind')} />
                Wind & Ocean Currents
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input type="checkbox" checked={layers.alerts} onChange={() => toggleLayer('alerts')} />
                Marine Alerts & Warnings
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input type="checkbox" checked={layers.cyclones} onChange={() => toggleLayer('cyclones')} />
                Cyclones / Severe Storms
              </label>
            </div>
          </section>

          {/* VISUAL LEGEND */}
          <section>
            <h3 style={{ fontSize: 11, textTransform: 'uppercase', color: '#8892b0', margin: '0 0 10px 0', letterSpacing: 1 }}>Visual Legend</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 11 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#2ecc71' }}></div>
                User GPS Location
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#3a86ff' }}></div>
                Major Marine Port
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 16, borderBottom: '3px solid #2ecc71' }}></div>
                Safe Navigation Route
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 14, height: 14, background: 'rgba(255,159,10,0.35)', border: '2px dashed #ff9f0a' }}></div>
                Caution / Restricted Area
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 14, height: 14, background: 'rgba(0,180,216,0.35)', border: '2px solid #0096c7' }}></div>
                Fishing Zone (PFZ)
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 16, borderBottom: '2px dashed #ff3b30' }}></div>
                Maritime Boundary (EEZ)
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#ffb703' }}></div>
                Weather Station (°C)
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#48cae4' }}></div>
                Wave & Sea State (m)
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#9d4edd' }}></div>
                Wind & Current Vector
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 14, height: 14, background: 'rgba(255,59,48,0.4)', border: '2px solid #ff3b30' }}></div>
                Marine Alert
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#d90429' }}></div>
                Cyclone / Severe Storm
              </div>
            </div>
          </section>

        </div>
      </div>
    </div>
  )
}