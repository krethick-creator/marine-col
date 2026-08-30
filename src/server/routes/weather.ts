import { Router } from 'express'
import { z } from 'zod'
import { asyncHandler } from '../middleware/errorHandler'
import { validate } from '../middleware/validate'
import { getWeatherProvider } from '../services/weather'
import type { ApiSuccess, WeatherForecast, CurrentWeather } from '../types'

const router = Router()

const LocationSchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lon: z.coerce.number().min(-180).max(180),
  days: z.coerce.number().min(1).max(7).optional().default(3),
})

// GET /api/weather/current?lat=13.08&lon=80.27
router.get(
  '/current',
  validate(LocationSchema, 'query'),
  asyncHandler(async (req, res) => {
    const { lat, lon } = ((req as any).validatedQuery || req.query) as z.infer<typeof LocationSchema>
    const provider = getWeatherProvider()
    const data: CurrentWeather = await provider.getCurrentConditions({ lat, lon })
    const body: ApiSuccess<CurrentWeather> = {
      ok: true,
      data,
      isMockData: data.isMockData,
      timestamp: new Date().toISOString(),
    }
    res.json(body)
  })
)

// GET /api/weather/forecast?lat=13.08&lon=80.27&days=3
router.get(
  '/forecast',
  validate(LocationSchema, 'query'),
  asyncHandler(async (req, res) => {
    const { lat, lon, days } = ((req as any).validatedQuery || req.query) as z.infer<typeof LocationSchema>
    const provider = getWeatherProvider()
    const data: WeatherForecast = await provider.getForecast({ lat, lon }, days ?? 3)
    const body: ApiSuccess<WeatherForecast> = {
      ok: true,
      data,
      isMockData: data.isMockData,
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

export default router
