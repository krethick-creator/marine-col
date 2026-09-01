import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { Pool } from 'pg'
import { getGeospatialProvider } from '../services/geospatial'
import { getWeatherProvider } from '../services/weather'
import { getOceanProvider } from '../services/ocean'
import { getAdvisoryProvider } from '../services/advisories'
import { getSafeRoute } from '../agents/routeAgent'
import type { Alert } from '../types'

const router = Router()

const latLonSchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lon: z.coerce.number().min(-180).max(180),
})

// Major real marine ports in India
const MAJOR_PORTS = [
  { id: 'port-1', name: 'Chennai Port', lat: 13.0839, lon: 80.2933, type: 'major_port' },
  { id: 'port-2', name: 'Kochi Port', lat: 9.9658, lon: 76.2711, type: 'major_port' },
  { id: 'port-3', name: 'Mumbai Port (JNPT)', lat: 18.9500, lon: 72.9500, type: 'major_port' },
  { id: 'port-4', name: 'Visakhapatnam Port', lat: 17.6868, lon: 83.2985, type: 'major_port' },
  { id: 'port-5', name: 'Mormugao Port, Goa', lat: 15.4133, lon: 73.8017, type: 'major_port' },
  { id: 'port-6', name: 'V.O.C. Port, Tuticorin', lat: 8.7533, lon: 78.1964, type: 'major_port' },
  { id: 'port-7', name: 'Paradip Port, Odisha', lat: 20.2644, lon: 86.6706, type: 'major_port' },
  { id: 'port-8', name: 'Deendayal Port, Kandla', lat: 23.0033, lon: 70.2228, type: 'major_port' },
  { id: 'port-9', name: 'New Mangalore Port', lat: 12.9231, lon: 74.8105, type: 'major_port' },
  { id: 'port-10', name: 'Syama Prasad Mookerjee Port, Kolkata', lat: 22.5411, lon: 88.3242, type: 'major_port' },
]

router.get('/', async (req: Request, res: Response) => {
  const parsed = latLonSchema.safeParse(req.query)
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid or missing lat/lon' })
  }

  try {
    const provider = getGeospatialProvider()
    const [distanceToBoundaryNm, nearestFishingZoneKm] = await Promise.all([
      provider.distanceToBoundaryNm(parsed.data),
      provider.nearestFishingZoneKm(parsed.data),
    ])
    res.json({ dataSource: provider.dataSource, distanceToBoundaryNm, nearestFishingZoneKm })
  } catch (err) {
    console.error('Geospatial route error:', err)
    res.status(500).json({ error: 'Geospatial lookup failed' })
  }
})

// GET /api/geospatial/boundaries?lat={lat}&lon={lon}
router.get('/boundaries', async (req: Request, res: Response) => {
  const parsed = latLonSchema.safeParse(req.query)
  if (!parsed.success) {
    return res.status(400).json({ ok: false, error: 'Invalid or missing lat/lon parameters' })
  }

  try {
    const provider = getGeospatialProvider()
    const boundaries = await provider.getNearbyBoundaries(parsed.data)
    
    res.json({
      ok: true,
      data: { boundaries },
      providerStatus: provider.isMock ? 'MOCK_DATA' : 'REAL_DATA_SUCCESS',
      isMockData: provider.isMock,
      timestamp: new Date().toISOString()
    })
  } catch (err) {
    console.error('Boundaries fetch error:', err)
    res.status(500).json({ ok: false, error: 'Failed to fetch boundaries' })
  }
})

let _featuresPool: Pool | null = null
function getFeaturesPool(): Pool {
  if (!_featuresPool) {
    _featuresPool = new Pool({ connectionString: process.env.DATABASE_URL })
  }
  return _featuresPool
}

router.get('/features', async (_req: Request, res: Response) => {
  try {
    const pool = getFeaturesPool()
    const [boundaries, fishingZones, restrictedZones, mpas] = await Promise.all([
      pool.query('SELECT id, name, type, ST_AsGeoJSON(geometry) AS geojson FROM boundaries'),
      pool.query('SELECT id, name, suitability_score, ST_AsGeoJSON(geometry) AS geojson FROM fishing_zones'),
      pool.query('SELECT id, name, type, ST_AsGeoJSON(geometry) AS geojson FROM restricted_zones'),
      pool.query('SELECT id, name, ST_AsGeoJSON(geometry) AS geojson FROM marine_protected_areas'),
    ])

    const portsFeatures = MAJOR_PORTS.map((p) => ({
      type: 'Feature',
      properties: { id: p.id, name: p.name, type: p.type },
      geometry: { type: 'Point', coordinates: [p.lon, p.lat] },
    }))

    res.json({
      boundaries: boundaries.rows.map((r) => ({
        type: 'Feature',
        properties: { id: r.id, name: r.name, type: r.type },
        geometry: JSON.parse(r.geojson),
      })),
      fishingZones: fishingZones.rows.map((r) => ({
        type: 'Feature',
        properties: { id: r.id, name: r.name, suitabilityScore: r.suitability_score },
        geometry: JSON.parse(r.geojson),
      })),
      restrictedZones: restrictedZones.rows.map((r) => ({
        type: 'Feature',
        properties: { id: r.id, name: r.name, type: r.type },
        geometry: JSON.parse(r.geojson),
      })),
      marineProtectedAreas: mpas.rows.map((r) => ({
        type: 'Feature',
        properties: { id: r.id, name: r.name },
        geometry: JSON.parse(r.geojson),
      })),
      ports: portsFeatures,
    })
  } catch (err) {
    console.error('Geospatial features route error:', err)
    res.status(500).json({ error: 'Failed to fetch geospatial features' })
  }
})

// GET /api/geospatial/live-layers?lat={lat}&lon={lon}
router.get('/live-layers', async (req: Request, res: Response) => {
  const parsed = latLonSchema.safeParse(req.query)
  const lat = parsed.success ? parsed.data.lat : 13.0827
  const lon = parsed.success ? parsed.data.lon : 80.2707

  try {
    const weatherProv = getWeatherProvider()
    const oceanProv = getOceanProvider()
    const advisoryProv = getAdvisoryProvider()

    // Query live Open-Meteo weather, ocean marine snapshot, alerts, and safe route
    const [weatherRes, oceanRes, alertsRes, safeRouteRes] = await Promise.all([
      weatherProv.getCurrentConditions({ lat, lon }).catch(() => null),
      oceanProv.getSnapshot({ lat, lon }).catch(() => null),
      advisoryProv.getActiveAlerts({ lat, lon }, 200).catch(() => [] as Alert[]),
      getSafeRoute(lat, lon, lat + 0.25, lon + 0.35, { boatKey: 'mechanized' }).catch(() => null)
    ])

    const weatherSnap = weatherRes?.data
    const oceanSnap = oceanRes?.data

    // Weather Feature at user location & coastal points
    const weatherFeatures = weatherSnap ? [{
      type: 'Feature',
      properties: {
        temperature: weatherSnap.temperature,
        condition: weatherSnap.condition,
        humidity: weatherSnap.humidity,
        windSpeed: weatherSnap.windSpeed,
        location: `${lat.toFixed(2)}, ${lon.toFixed(2)}`
      },
      geometry: { type: 'Point', coordinates: [lon, lat] }
    }] : []

    // Waves & Sea State Feature
    const waveFeatures = oceanSnap?.waveHeight !== null && oceanSnap?.waveHeight !== undefined ? [{
      type: 'Feature',
      properties: {
        waveHeight: oceanSnap.waveHeight,
        swellPeriod: oceanSnap.swellPeriod,
        seaState: oceanSnap.seaState || 'Normal',
        units: 'm'
      },
      geometry: { type: 'Point', coordinates: [lon, lat] }
    }] : []

    // Wind & Currents Feature
    const windFeatures = (oceanSnap?.currentSpeed !== null || weatherSnap?.windSpeed !== undefined) ? [{
      type: 'Feature',
      properties: {
        windSpeed: weatherSnap?.windSpeed || 0,
        windDirection: weatherSnap?.windDirection || 'N',
        currentSpeed: oceanSnap?.currentSpeed || 0,
        currentDirection: oceanSnap?.currentDirection || 'N'
      },
      geometry: { type: 'Point', coordinates: [lon, lat] }
    }] : []

    // Safe Route Line
    const safeRouteFeatures = (safeRouteRes && safeRouteRes.waypoints && safeRouteRes.waypoints.length > 0) ? [{
      type: 'Feature',
      properties: {
        name: 'Recommended Safe Marine Route',
        status: safeRouteRes.status,
        distanceKm: safeRouteRes.distanceKm
      },
      geometry: {
        type: 'LineString',
        coordinates: safeRouteRes.waypoints.map(w => [w[1], w[0]])
      }
    }] : []

    // Alerts Features
    const rawAlerts: Alert[] = alertsRes || []
    const alertFeatures = rawAlerts.map((a, idx) => ({
      type: 'Feature',
      properties: {
        id: a.id || `alert-${idx}`,
        title: a.title,
        severity: a.severity,
        type: a.type,
        description: a.description
      },
      geometry: a.affectedArea && a.affectedArea.length > 0
        ? { type: 'Polygon', coordinates: [a.affectedArea.map(pt => [pt.lon, pt.lat])] }
        : { type: 'Point', coordinates: [lon, lat] }
    }))

    // Cyclone / Storm Features
    const cycloneFeatures = alertFeatures.filter(f => f.properties.severity === 'HIGH' || f.properties.type === 'HIGH_WAVES' || f.properties.type === 'STRONG_WINDS' || f.properties.type === 'CYCLONE')

    res.json({
      ok: true,
      timestamp: new Date().toISOString(),
      layers: {
        weather: { features: weatherFeatures, status: weatherFeatures.length > 0 ? 'LIVE DATA' : 'NO DATA' },
        waves: { features: waveFeatures, status: waveFeatures.length > 0 ? 'LIVE DATA' : 'NO DATA' },
        wind: { features: windFeatures, status: windFeatures.length > 0 ? 'LIVE DATA' : 'NO DATA' },
        safeRoutes: { features: safeRouteFeatures, status: safeRouteFeatures.length > 0 ? 'LIVE DATA' : 'NO DATA' },
        alerts: { features: alertFeatures, status: alertFeatures.length > 0 ? 'LIVE DATA' : 'NO DATA' },
        cyclones: { features: cycloneFeatures, status: cycloneFeatures.length > 0 ? 'LIVE DATA' : 'NO DATA' }
      }
    })
  } catch (err) {
    console.error('Live layers route error:', err)
    res.status(500).json({ ok: false, error: 'Failed to fetch live layers' })
  }
})

export default router