import { Router } from 'express'
import { z } from 'zod'
import { asyncHandler } from '../middleware/errorHandler'
import { validate } from '../middleware/validate'
import { getOceanProvider } from '../services/ocean'
import { getSatelliteProvider } from '../services/satellite'
import type { ApiSuccess } from '../types'

const router = Router()

const LocationSchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lon: z.coerce.number().min(-180).max(180),
  radiusKm: z.coerce.number().min(1).max(500).optional().default(100),
})

// GET /api/ocean/snapshot
router.get('/snapshot', validate(LocationSchema, 'query'), asyncHandler(async (req, res) => {
  const { lat, lon } = req.query as unknown as z.infer<typeof LocationSchema>
  const result = await getOceanProvider().getSnapshot({ lat, lon })
  const body: ApiSuccess<typeof result.data> = { ok: true, data: result.data, isMockData: result.status === 'MOCK_DATA', timestamp: new Date().toISOString() }
  res.json(body)
}))

// GET /api/ocean/pfz
router.get('/pfz', validate(LocationSchema, 'query'), asyncHandler(async (req, res) => {
  const { lat, lon, radiusKm } = req.query as unknown as z.infer<typeof LocationSchema>
  const data = await getOceanProvider().getPFZZones({ lat, lon }, radiusKm)
  const isMock = data.every((z) => z.isMockData)
  const body: ApiSuccess<typeof data> = { ok: true, data, isMockData: isMock, timestamp: new Date().toISOString() }
  res.json(body)
}))

// GET /api/ocean/satellite
router.get('/satellite', validate(LocationSchema, 'query'), asyncHandler(async (req, res) => {
  const { lat, lon } = req.query as unknown as z.infer<typeof LocationSchema>
  const result = await getSatelliteProvider().getSnapshot({ lat, lon })
  const body: ApiSuccess<typeof result.data> = { ok: true, data: result.data, isMockData: result.status === 'MOCK_DATA', timestamp: new Date().toISOString() }
  res.json(body)
}))

export default router
