import { Router } from 'express'
import { z } from 'zod'
import { asyncHandler } from '../middleware/errorHandler'
import { validate } from '../middleware/validate'
import { getGeospatialProvider } from '../services/geospatial'
import type { ApiSuccess } from '../types'

const router = Router()

const LocationSchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lon: z.coerce.number().min(-180).max(180),
})

// GET /api/boundaries/distance?lat=13.08&lon=80.27
// Returns distance from location to nearest international maritime boundary
router.get('/distance', validate(LocationSchema, 'query'), asyncHandler(async (req, res) => {
  const { lat, lon } = req.query as unknown as z.infer<typeof LocationSchema>
  const distanceNm = await getGeospatialProvider().distanceToBoundaryNm({ lat, lon })
  const isSafe = distanceNm > 10
  const body: ApiSuccess<{ distanceNm: number; isSafe: boolean; isMockData: boolean }> = {
    ok: true,
    data: { distanceNm, isSafe, isMockData: true },
    isMockData: true,
    timestamp: new Date().toISOString(),
  }
  res.json(body)
}))

const RouteSchema = z.object({
  originLat:  z.coerce.number(),
  originLon:  z.coerce.number(),
  destLat:    z.coerce.number(),
  destLon:    z.coerce.number(),
})

// GET /api/boundaries/analyse-route
// Checks if a route intersects restricted zones or approaches the boundary
router.get('/analyse-route', validate(RouteSchema, 'query'), asyncHandler(async (req, res) => {
  const { originLat, originLon, destLat, destLon } = req.query as unknown as z.infer<typeof RouteSchema>
  const result = await getGeospatialProvider().analyseRoute(
    { lat: originLat, lon: originLon },
    { lat: destLat,   lon: destLon   }
  )
  const body: ApiSuccess<typeof result.data> = { ok: true, data: result.data, isMockData: result.status === 'MOCK_DATA', timestamp: new Date().toISOString() }
  res.json(body)
}))

export default router
