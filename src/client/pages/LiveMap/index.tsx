import { useEffect, useRef, useState } from 'react'
import * as maplibregl from 'maplibre-gl' 
import 'maplibre-gl/dist/maplibre-gl.css'

export default function LiveMapPage() {
  const mapContainer = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const [info, setInfo] = useState<{ distanceToBoundaryNm: number; nearestFishingZoneKm: number } | null>(null)

  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: 'https://tiles.openfreemap.org/styles/liberty',
      center: [80.27, 13.08],
      zoom: 5,
    })
    mapRef.current = map

    map.on('load', async () => {
      try {
        const res = await fetch('/api/geospatial/features')
        const data = await res.json()

        map.addSource('boundaries', { type: 'geojson', data: { type: 'FeatureCollection', features: data.boundaries } })
        map.addLayer({
          id: 'boundaries-line',
          type: 'line',
          source: 'boundaries',
          paint: { 'line-color': '#ff3b30', 'line-width': 2, 'line-dasharray': [2, 2] },
        })

        map.addSource('fishing-zones', { type: 'geojson', data: { type: 'FeatureCollection', features: data.fishingZones } })
        map.addLayer({
          id: 'fishing-zones-fill',
          type: 'fill',
          source: 'fishing-zones',
          paint: { 'fill-color': '#2d8bba', 'fill-opacity': 0.35 },
        })
        map.addLayer({
          id: 'fishing-zones-outline',
          type: 'line',
          source: 'fishing-zones',
          paint: { 'line-color': '#2d8bba', 'line-width': 1.5 },
        })
      } catch (err) {
        console.error('Failed to load map features:', err)
      }
    })

    map.on('click', async (e) => {
      const { lng, lat } = e.lngLat
      new maplibregl.Marker({ color: '#ffcc00' }).setLngLat([lng, lat]).addTo(map)

      try {
        const res = await fetch(`/api/geospatial?lat=${lat}&lon=${lng}`)
        const json = await res.json()
        setInfo(json)
      } catch (err) {
        console.error('Failed to fetch geospatial info:', err)
      }
    })

    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [])

  return (
    <div className="page-shell" style={{ padding: 0, position: 'relative', flex: 1, height: '100%' }}>
      <div ref={mapContainer} style={{ position: 'absolute', inset: 0 }} />
      <div style={{
        position: 'absolute', top: 16, left: 16, zIndex: 10,
        background: 'rgba(10,20,30,0.85)', color: '#e0f0ff',
        padding: '12px 16px', borderRadius: 10, fontFamily: 'Outfit, sans-serif', fontSize: 13,
        maxWidth: 260, border: '1px solid rgba(45,139,186,0.3)',
      }}>
        <div style={{ fontWeight: 700, marginBottom: 6 }}>🗺 Live Marine Map</div>
        <div style={{ opacity: 0.7, marginBottom: 8 }}>Click anywhere on the map to check boundary & fishing zone distance.</div>
        {info && (
          <div>
            <div>📍 Distance to boundary: <b>{info.distanceToBoundaryNm} nm</b></div>
            <div>🐟 Nearest fishing zone: <b>{info.nearestFishingZoneKm} km</b></div>
          </div>
        )}
      </div>
    </div>
  )
}