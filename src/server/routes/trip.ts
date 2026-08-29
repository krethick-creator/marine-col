import { Router } from 'express'
import { z } from 'zod'
import { v4 as uuidv4 } from 'uuid'
import { asyncHandler } from '../middleware/errorHandler'
import { validate } from '../middleware/validate'
import { getWeatherProvider } from '../services/weather'
import type { ApiSuccess, TripPlan, DayPlan, StatusLevel, TimeSlot } from '../types'

const router = Router()

const TripSchema = z.object({
  lat:              z.coerce.number().min(-90).max(90),
  lon:              z.coerce.number().min(-180).max(180),
  startLocationName:z.string().default('Your Location'),
  days:             z.coerce.number().min(1).max(3).default(3),
  travelTimeMinutes:z.coerce.number().min(10).max(480).default(45),
})

// GET /api/trip/plan?lat=13.08&lon=80.27&days=3
router.get('/plan', validate(TripSchema, 'query'), asyncHandler(async (req, res) => {
  const { lat, lon, startLocationName, days, travelTimeMinutes } = req.query as unknown as z.infer<typeof TripSchema>

  const weather = getWeatherProvider()
  const forecast = await weather.getForecast({ lat, lon }, days)

  const dayPlans: DayPlan[] = forecast.daily.slice(0, days).map((day, i) => {
    const isBadDay   = day.waveHeightMax > 2.5 || day.windSpeedMax > 30
    const isCautionDay = !isBadDay && (day.waveHeightMax > 1.5 || day.windSpeedMax > 20)
    const dayStatus: StatusLevel = isBadDay ? 'NO_GO' : isCautionDay ? 'CAUTION' : 'GO'

    const morning: TimeSlot   = { label: 'Morning',   status: dayStatus === 'NO_GO' ? 'NO_GO' : 'GO',      notes: isBadDay ? 'Conditions unsafe.' : 'Depart early for best window.' }
    const afternoon: TimeSlot = { label: 'Afternoon', status: isCautionDay ? 'CAUTION' : dayStatus,         notes: isCautionDay ? 'Conditions worsening — return by midday.' : isBadDay ? 'Avoid.' : 'Safe conditions continue.' }
    const evening: TimeSlot   = { label: 'Evening',   status: dayStatus === 'GO' ? 'GO' : 'NO_GO',          notes: isBadDay ? 'Do not attempt.' : 'Return before sunset.' }

    return {
      date: day.date,
      dayNumber: i + 1,
      status: dayStatus,
      morning,
      afternoon,
      evening,
      recommendedDepartureTime: dayStatus !== 'NO_GO' ? '06:30 AM' : undefined,
      recommendedReturnTime: isCautionDay ? '11:30 AM' : dayStatus === 'GO' ? '03:00 PM' : undefined,
      weatherSummary: `Wind ${day.windSpeedMax} km/h · Waves ${day.waveHeightMax} m · ${day.condition}`,
      warnings: isBadDay
        ? ['DO NOT GO — conditions are dangerous']
        : isCautionDay
          ? [`Return before 11:30 AM — conditions worsen after that`]
          : [],
    }
  })

  const overallStatus: StatusLevel = dayPlans.every(d => d.status === 'NO_GO')
    ? 'NO_GO'
    : dayPlans.some(d => d.status === 'NO_GO' || d.status === 'CAUTION')
      ? 'CAUTION'
      : 'GO'

  const plan: TripPlan = {
    id: uuidv4(),
    startLocation: { lat, lon },
    startLocationName,
    departureDateStr: 'Tomorrow',
    days,
    dayPlans,
    overallStatus,
    isMockData: forecast.isMockData,
    generatedAt: new Date(),
  }

  const body: ApiSuccess<TripPlan> = {
    ok: true,
    data: plan,
    isMockData: plan.isMockData,
    timestamp: new Date().toISOString(),
  }
  res.json(body)
}))

export default router
