import { Router } from 'express'
import { z } from 'zod'
import { asyncHandler } from '../middleware/errorHandler'
import { validate } from '../middleware/validate'
import { getWeatherProvider } from '../services/weather'
import type { ApiSuccess } from '../types'

const router = Router()

const LocationSchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lon: z.coerce.number().min(-180).max(180),
  days: z.coerce.number().min(1).max(7).optional().default(3),
})

const HistoryLocationSchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lon: z.coerce.number().min(-180).max(180),
  days: z.coerce.number().min(1).max(30).optional().default(7),
})

// GET /api/weather/current
router.get(
  '/current',
  validate(LocationSchema, 'query'),
  asyncHandler(async (req, res) => {
    const { lat, lon } = ((req as any).validatedQuery || req.query) as z.infer<typeof LocationSchema>
    const provider = getWeatherProvider()
    const result = await provider.getCurrentConditions({ lat, lon })
    const data = result.data
    const body: ApiSuccess<typeof data> = {
      ok: true,
      data,
      isMockData: result.status === 'MOCK_DATA',
      timestamp: new Date().toISOString(),
    }
    res.json(body)
  })
)

// GET /api/weather/forecast
router.get(
  '/forecast',
  validate(LocationSchema, 'query'),
  asyncHandler(async (req, res) => {
    const { lat, lon, days } = ((req as any).validatedQuery || req.query) as z.infer<typeof LocationSchema>
    const provider = getWeatherProvider()
    const result = await provider.getForecast({ lat, lon }, days ?? 3)
    const data = result.data
    const body: ApiSuccess<typeof data> = {
      ok: true,
      data,
      isMockData: result.status === 'MOCK_DATA',
      timestamp: new Date().toISOString(),
    }
    res.json(body)
  })
)

// GET /api/weather/freshness
router.get('/freshness', asyncHandler(async (_req, res) => {
  const provider = getWeatherProvider()
  const data = provider.getDataFreshness()
  res.json({ ok: true, data, timestamp: new Date().toISOString() })
}))

// GET /api/weather/history
router.get(
  '/history',
  validate(HistoryLocationSchema, 'query'),
  asyncHandler(async (req, res) => {
    const { lat, lon, days } = ((req as any).validatedQuery || req.query) as z.infer<typeof HistoryLocationSchema>
    const provider = getWeatherProvider()
    const result = await provider.getHistoricalData({ lat, lon }, days ?? 7)
    const data = result.data
    const body: ApiSuccess<typeof data> = {
      ok: true,
      data,
      isMockData: result.status === 'MOCK_DATA',
      timestamp: new Date().toISOString(),
    }
    res.json(body)
  })
)

export default router
