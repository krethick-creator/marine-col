import { Router } from 'express'
import { z } from 'zod'
import { v4 as uuidv4 } from 'uuid'
import { asyncHandler } from '../middleware/errorHandler'
import { validate } from '../middleware/validate'
import { getWeatherProvider } from '../services/weather'
import { getSafeRoute } from '../agents/routeAgent'
import type { ApiSuccess, TripPlan, DayPlan, StatusLevel, TimeSlot, SafeRouteResult } from '../types'


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
  const { lat, lon, startLocationName, days, travelTimeMinutes } = ((req as any).validatedQuery || req.query) as z.infer<typeof TripSchema>

  const weather = getWeatherProvider()
  const forecastResult = await weather.getForecast({ lat, lon }, days)
  const forecast = forecastResult.data

  if (!forecast) {
    res.status(503).json({ ok: false, error: 'Weather forecast provider is temporarily unavailable.' })
    return
  }

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
    isMockData: forecastResult.status === 'MOCK_DATA',
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

const SafeRouteSchema = z.object({
  originLat:     z.coerce.number().min(-90).max(90),
  originLon:     z.coerce.number().min(-180).max(180),
  destLat:       z.coerce.number().min(-90).max(90),
  destLon:       z.coerce.number().min(-180).max(180),
  boatKey:       z.string().optional().default('mechanized'),
  departureTime: z.string().optional(),
  cycloneActive: z.preprocess((val) => val === 'true' || val === true, z.boolean()).optional().default(false),
})

// GET /api/trip/safe-route?originLat=13.08&originLon=80.27&destLat=13.25&destLon=80.45&boatKey=small
router.get('/safe-route', validate(SafeRouteSchema, 'query'), asyncHandler(async (req, res) => {
  const { originLat, originLon, destLat, destLon, boatKey, departureTime, cycloneActive } = req.query as unknown as z.infer<typeof SafeRouteSchema>
  
  const depDate = departureTime && !isNaN(new Date(departureTime).getTime()) ? new Date(departureTime) : new Date()
  const result = await getSafeRoute(originLat, originLon, destLat, destLon, {
    boatKey,
    departureTime: depDate,
    cycloneActive,
  })

  const body: ApiSuccess<SafeRouteResult> = {
    ok: true,
    data: result,
    isMockData: false,
    timestamp: new Date().toISOString(),
  }
  res.json(body)
}))

import { getOceanProvider } from '../services/ocean'
import { getGeospatialProvider } from '../services/geospatial'

const TripAnalyzeSchema = z.object({
  originLat:     z.coerce.number().min(-90).max(90),
  originLon:     z.coerce.number().min(-180).max(180),
  originName:    z.string().default('Origin'),
  destLat:       z.coerce.number().min(-90).max(90),
  destLon:       z.coerce.number().min(-180).max(180),
  destName:      z.string().default('Destination'),
  departureDate: z.string().optional(),
  departureTime: z.string().optional(),
  boatKey:       z.enum(['small', 'mechanized']).default('mechanized'),
  purpose:       z.string().optional().default('Fishing'),
})

// POST /api/trip/analyze
router.post('/analyze', validate(TripAnalyzeSchema, 'body'), asyncHandler(async (req, res) => {
  const {
    originLat, originLon, originName,
    destLat, destLon, destName,
    departureDate, departureTime, boatKey, purpose
  } = req.body

  const weatherProv = getWeatherProvider()
  const oceanProv = getOceanProvider()
  const geoProv = getGeospatialProvider()

  const depDateTimeStr = `${departureDate || new Date().toISOString().split('T')[0]}T${departureTime || '06:00'}:00`
  const depDate = new Date(depDateTimeStr)
  const validDepDate = !isNaN(depDate.getTime()) ? depDate : new Date()

  // Concurrently execute Weather, Ocean, Geospatial & Route agents
  const [weatherResult, oceanResult, boundaryDist, fishingZoneKm, routeAnalysisResult, routeResult] = await Promise.all([
    weatherProv.getCurrentConditions({ lat: originLat, lon: originLon }).catch(() => null),
    oceanProv.getSnapshot({ lat: originLat, lon: originLon }).catch(() => null),
    geoProv.distanceToBoundaryNm({ lat: originLat, lon: originLon }).catch(() => 999),
    geoProv.nearestFishingZoneKm({ lat: originLat, lon: originLon }).catch(() => -1),
    geoProv.analyseRoute({ lat: originLat, lon: originLon }, { lat: destLat, lon: destLon }).catch(() => null),
    getSafeRoute(originLat, originLon, destLat, destLon, { boatKey, departureTime: validDepDate }).catch(() => null)
  ])

  // Unwrap ProviderResults
  const weatherSnap = weatherResult?.data ?? null
  const oceanSnap = oceanResult?.data ?? null
  const routeAnalysis = routeAnalysisResult?.data ?? null
  const isMockWeather = weatherResult?.status === 'MOCK_DATA'
  const isMockOcean = oceanResult?.status === 'MOCK_DATA'

  // Determine overall risk recommendation
  const reasons: string[] = []
  let overallStatus: StatusLevel = 'GO'

  if (routeResult) {
    if (routeResult.status === 'NO-GO' || (routeResult.status as string) === 'NO_GO') {
      overallStatus = 'NO_GO'
      if (routeResult.reason) reasons.push(routeResult.reason)
      if (routeResult.hazards && routeResult.hazards.length > 0) {
        reasons.push(...routeResult.hazards)
      }
    } else if (routeResult.status === 'CAUTION') {
      overallStatus = 'CAUTION'
      if (routeResult.reason) reasons.push(routeResult.reason)
      if (routeResult.hazards && routeResult.hazards.length > 0) {
        reasons.push(...routeResult.hazards)
      } else if (routeResult.cautionNodesCount && routeResult.cautionNodesCount > 0) {
        reasons.push(`Elevated sea state or wind conditions encountered on ${routeResult.cautionNodesCount} route waypoint(s).`)
      }
    }
  }

  if (routeAnalysis?.routeIntersectsRestricted) {
    overallStatus = 'NO_GO'
    reasons.push(`Route intersects restricted zones: ${routeAnalysis.restrictedZonesOnRoute.join(', ')}`)
  }

  if (boundaryDist < 10) {
    overallStatus = 'NO_GO'
    reasons.push(`Dangerously close to international maritime boundary (${boundaryDist} nm).`)
  } else if (boundaryDist < 60 && overallStatus !== 'NO_GO') {
    if (overallStatus === 'GO') overallStatus = 'CAUTION'
    reasons.push(`Operating near maritime boundary (${boundaryDist} nm). Maintain heightened watch.`)
  }

  const effWave = oceanSnap?.waveHeight ?? weatherSnap?.waveHeight ?? 0
  const effWind = weatherSnap?.windSpeed ?? 0

  const boatMaxWave = boatKey === 'small' ? 1.2 : 2.0
  const boatMaxWind = boatKey === 'small' ? 25 : 35

  if (effWave > boatMaxWave) {
    if (effWave > boatMaxWave * 1.5) {
      overallStatus = 'NO_GO'
    } else if (overallStatus !== 'NO_GO') {
      overallStatus = 'CAUTION'
    }
    reasons.push(`Wave height (${effWave} m) exceeds recommended threshold (${boatMaxWave} m) for ${boatKey === 'small' ? 'small traditional boat' : 'mechanized boat'}.`)
  }

  if (effWind > boatMaxWind) {
    if (effWind > boatMaxWind * 1.3) {
      overallStatus = 'NO_GO'
    } else if (overallStatus !== 'NO_GO') {
      overallStatus = 'CAUTION'
    }
    reasons.push(`Wind speed (${effWind} km/h) exceeds operational limit (${boatMaxWind} km/h) for ${boatKey === 'small' ? 'small traditional boat' : 'mechanized boat'}.`)
  }

  const uniqueReasons = Array.from(new Set(reasons))

  if (overallStatus === 'CAUTION' && uniqueReasons.length === 0) {
    uniqueReasons.push('Elevated marine risks or weather conditions detected along route.')
  } else if (overallStatus === 'NO_GO' && uniqueReasons.length === 0) {
    uniqueReasons.push('Unsafe marine or environmental conditions detected along planned route.')
  } else if (overallStatus === 'GO' && uniqueReasons.length === 0) {
    uniqueReasons.push('All weather, ocean, geospatial, and routing parameters are within safe limits for your vessel.')
  }

  const analysisData = {
    tripSummary: {
      originName,
      origin: { lat: originLat, lon: originLon },
      destName,
      destination: { lat: destLat, lon: destLon },
      departureDate: departureDate || new Date().toISOString().split('T')[0],
      departureTime: departureTime || '06:00 AM',
      boatKey,
      boatLabel: boatKey === 'small' ? 'Small traditional boat' : 'Mechanized boat',
      purpose: purpose || 'General',
    },
    route: routeResult,
    weather: weatherSnap,
    ocean: oceanSnap,
    geospatial: {
      distanceToBoundaryNm: boundaryDist,
      nearestFishingZoneKm: fishingZoneKm,
      routeAnalysis,
      dataSource: geoProv.dataSource,
      isMockData: geoProv.isMock,
    },
    risk: {
      overallStatus,
      reasons: uniqueReasons,
    }
  }

  const response: ApiSuccess<typeof analysisData> = {
    ok: true,
    data: analysisData,
    isMockData: geoProv.isMock || isMockWeather || isMockOcean,
    timestamp: new Date().toISOString(),
  }

  res.json(response)
}))

export default router


