import { Router } from 'express'
import { z } from 'zod'
import { asyncHandler } from '../middleware/errorHandler'
import { validate } from '../middleware/validate'
import { getAdvisoryProvider } from '../services/advisories'
import type { ApiSuccess } from '../types'

const router = Router()

const LocationSchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lon: z.coerce.number().min(-180).max(180),
  radiusKm: z.coerce.number().optional().default(200),
})

// GET /api/alerts?lat=13.08&lon=80.27
router.get('/', validate(LocationSchema, 'query'), asyncHandler(async (req, res) => {
  const { lat, lon, radiusKm } = req.query as unknown as z.infer<typeof LocationSchema>
  const data = await getAdvisoryProvider().getActiveAlerts({ lat, lon }, radiusKm)
  const isMock = data.every((a) => a.isMockData)
  const body: ApiSuccess<typeof data> = { ok: true, data, isMockData: isMock, timestamp: new Date().toISOString() }
  res.json(body)
}))

// GET /api/alerts/advisories
router.get('/advisories', asyncHandler(async (_req, res) => {
  const data = await getAdvisoryProvider().getAdvisories()
  const isMock = data.every((a) => a.isMockData)
  const body: ApiSuccess<typeof data> = { ok: true, data, isMockData: isMock, timestamp: new Date().toISOString() }
  res.json(body)
}))

export default router
