import { Router } from 'express'
import { z } from 'zod'
import { asyncHandler } from '../middleware/errorHandler'
import { validate } from '../middleware/validate'
import { getOceanProvider } from '../services/ocean'
import type { ApiSuccess } from '../types'

const router = Router()

const LocationSchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lon: z.coerce.number().min(-180).max(180),
  radiusKm: z.coerce.number().optional().default(150),
})

// GET /api/fishing/zones?lat=13.08&lon=80.27&radiusKm=150
router.get('/zones', validate(LocationSchema, 'query'), asyncHandler(async (req, res) => {
  const { lat, lon, radiusKm } = req.query as unknown as z.infer<typeof LocationSchema>
  const data = await getOceanProvider().getPFZZones({ lat, lon }, radiusKm)
  const isMock = data.every((z) => z.isMockData)
  const body: ApiSuccess<typeof data> = { ok: true, data, isMockData: isMock, timestamp: new Date().toISOString() }
  res.json(body)
}))

export default router
