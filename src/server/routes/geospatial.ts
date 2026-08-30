import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { Pool } from 'pg'
import { getGeospatialProvider } from '../services/geospatial'

const router = Router()

const latLonSchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lon: z.coerce.number().min(-180).max(180),
})

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
    const [boundaries, fishingZones] = await Promise.all([
      pool.query('SELECT id, name, type, ST_AsGeoJSON(geometry) AS geojson FROM boundaries'),
      pool.query('SELECT id, name, suitability_score, ST_AsGeoJSON(geometry) AS geojson FROM fishing_zones'),
    ])

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
    })
  } catch (err) {
    console.error('Geospatial features route error:', err)
    res.status(500).json({ error: 'Failed to fetch geospatial features' })
  }
})

export default router