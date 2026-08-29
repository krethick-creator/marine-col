import { Router } from 'express'
import { z } from 'zod'
import { v4 as uuidv4 } from 'uuid'
import { asyncHandler } from '../middleware/errorHandler'
import { validate } from '../middleware/validate'
import { optionalAuth } from '../middleware/auth'
import { env } from '../config/env'
import type { ApiSuccess, SOSEvent } from '../types'

const router = Router()

// Audit log — Phase 3: move to PostgreSQL with full audit trail
const sosLog: SOSEvent[] = []

const SOSSchema = z.object({
  location: z.object({
    lat: z.number().min(-90).max(90),
    lon: z.number().min(-180).max(180),
  }),
  locationAccuracyMetres: z.number().optional(),
  tripId:                 z.string().optional(),
  message:                z.string().max(500).optional(),
  emergencyContactPhone:  z.string().max(20).optional(),
})

// POST /api/sos
// Requires explicit confirmation (handled by frontend confirm step).
// In demo mode: logs locally. Phase 3+: integrates with real emergency services.
router.post('/', optionalAuth, validate(SOSSchema), asyncHandler(async (req, res) => {
  const body = req.body as z.infer<typeof SOSSchema>

  const event: SOSEvent = {
    id: uuidv4(),
    userId: req.user?.userId,
    location: body.location,
    tripId: body.tripId,
    message: body.message,
    status: 'RECEIVED',
    createdAt: new Date(),
    isMockData: env.useMockData,
  }

  sosLog.push(event)

  // Audit log — always log SOS events regardless of mock mode
  console.warn('[SOS EVENT]', {
    id: event.id,
    location: event.location,
    userId: event.userId,
    isMock: event.isMockData,
    timestamp: event.createdAt.toISOString(),
  })

  // Phase 3+: dispatch to real emergency services API here
  // await emergencyServicesClient.dispatch(event)

  const resp: ApiSuccess<SOSEvent> = {
    ok: true,
    data: event,
    isMockData: event.isMockData,
    timestamp: new Date().toISOString(),
  }

  res.status(201).json(resp)
}))

// GET /api/sos/log — admin only, Phase 3
router.get('/log', asyncHandler(async (_req, res) => {
  // Phase 3: add requireAuth + requireRole('ADMIN')
  res.json({ ok: true, data: sosLog, count: sosLog.length })
}))

export default router
