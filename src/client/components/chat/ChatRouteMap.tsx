import { useEffect, useRef } from 'react'
import * as maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { routeToGeoJSON, getRouteStatusColor } from '../../services/api/routeService'

interface ChatRouteMapProps {
  routePlan: {
    success: boolean
    status: 'GO' | 'CAUTION' | 'NO-GO'
    waypoints: [number, number][]
  }
}

export default function ChatRouteMap({ routePlan }: ChatRouteMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const markersRef = useRef<maplibregl.Marker[]>([])

  useEffect(() => {
    if (!mapContainer.current || !routePlan?.waypoints || routePlan.waypoints.length === 0) return

    // Clean up any existing map
    if (mapRef.current) {
      mapRef.current.remove()
      mapRef.current = null
    }
    markersRef.current.forEach(m => m.remove())
    markersRef.current = []

    try {
      const map = new maplibregl.Map({
        container: mapContainer.current,
        style: 'https://tiles.openfreemap.org/styles/liberty',
        center: [routePlan.waypoints[0][1], routePlan.waypoints[0][0]],
        zoom: 7,
      })
      mapRef.current = map

      map.on('load', () => {
        if (!mapRef.current || mapRef.current !== map) return

        try {
          const geojson = {
            type: 'Feature' as const,
            properties: {},
            geometry: routeToGeoJSON(routePlan.waypoints)
          }

          map.addSource('route-line', {
            type: 'geojson',
            data: geojson
          })

          const visual = getRouteStatusColor(routePlan.status)

          map.addLayer({
            id: 'route-line-layer',
            type: 'line',
            source: 'route-line',
            layout: {
              'line-join': 'round',
              'line-cap': 'round'
            },
            paint: {
              'line-color': visual.color,
              'line-width': visual.width * 1.5,
              'line-opacity': visual.opacity
            }
          })

          // Fit bounds
          const bounds = new maplibregl.LngLatBounds()
          routePlan.waypoints.forEach(([lat, lon]) => {
            bounds.extend([lon, lat])
          })
          map.fitBounds(bounds, { padding: 30, maxZoom: 12, animate: false })

          // Add Markers
          const startWp = routePlan.waypoints[0]
          const endWp = routePlan.waypoints[routePlan.waypoints.length - 1]

          const startMarker = new maplibregl.Marker({ color: '#10B981' })
            .setLngLat([startWp[1], startWp[0]])
            .addTo(map)
          markersRef.current.push(startMarker)

          const endMarker = new maplibregl.Marker({ color: '#EF4444' })
            .setLngLat([endWp[1], endWp[0]])
            .addTo(map)
          markersRef.current.push(endMarker)

          // Force a resize check
          setTimeout(() => {
            if (mapRef.current === map) {
              map.resize()
            }
          }, 300)
        } catch (err) {
          console.error('[ChatRouteMap] Error rendering route lines:', err)
        }
      })
    } catch (err) {
      console.error('[ChatRouteMap] Map initialization failed:', err)
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
      markersRef.current.forEach(m => m.remove())
      markersRef.current = []
    }
  }, [routePlan])

  return (
    <div style={{
      width: '100%',
      height: '240px',
      borderRadius: '12px',
      overflow: 'hidden',
      marginTop: '12px',
      position: 'relative',
      border: '1px solid rgba(255,255,255,0.1)'
    }}>
      <div ref={mapContainer} style={{ width: '100%', height: '100%' }} />
    </div>
  )
}
