import { Router } from 'express'
import { z } from 'zod'
import { v4 as uuidv4 } from 'uuid'
import { asyncHandler } from '../middleware/errorHandler'
import { validate } from '../middleware/validate'
import { optionalAuth } from '../middleware/auth'
import type { ApiSuccess, CommunityPost, PostType } from '../types'

const router = Router()

// In-memory store for Phase 2. Phase 3 replaces with PostgreSQL.
export const posts: CommunityPost[] = [
  {
    id: uuidv4(),
    userId: 'demo-u1',
    userName: 'Ramesh K.',
    postType: 'CONDITION_REPORT',
    title: 'Sea conditions near Thiruvanmiyur',
    content: 'Morning sea was calm. Saw good fish near the 15 km mark. Wind picked up around 10 AM. Suggest early return.',
    locationName: 'Thiruvanmiyur Coast',
    reactions: { like: 12, helpful: 8, verify: 5 },
    commentsCount: 3,
    createdAt: new Date(Date.now() - 3 * 3600_000),
    isOfficial: false,
    isVerified: false,
  },
  {
    id: uuidv4(),
    userId: 'demo-u2',
    userName: 'Murugan S.',
    postType: 'DANGER_REPORT',
    title: 'Strong currents near Zone B today',
    content: 'WARNING: Strong undercurrents between 13.1°N and 13.2°N. My boat was affected. Please avoid.',
    locationName: 'Zone B — Offshore',
    reactions: { like: 28, helpful: 24, verify: 15 },
    commentsCount: 11,
    createdAt: new Date(Date.now() - 3600_000),
    isOfficial: false,
    isVerified: true,
  },
]

const ListSchema = z.object({
  page:  z.coerce.number().min(1).optional().default(1),
  limit: z.coerce.number().min(1).max(50).optional().default(20),
  type:  z.enum(['OBSERVATION', 'CONDITION_REPORT', 'ZONE_REPORT', 'DANGER_REPORT']).optional(),
})

// GET /api/community
router.get('/', validate(ListSchema, 'query'), asyncHandler(async (req, res) => {
  const { page, limit, type } = req.query as unknown as z.infer<typeof ListSchema>
  let filtered = [...posts].reverse()
  if (type) filtered = filtered.filter((p) => p.postType === type)
  const start = (page - 1) * limit
  const data = filtered.slice(start, start + limit)
  res.json({ ok: true, data, total: filtered.length, isMockData: true, timestamp: new Date().toISOString() })
}))

const CreatePostSchema = z.object({
  postType:     z.enum(['OBSERVATION', 'CONDITION_REPORT', 'ZONE_REPORT', 'DANGER_REPORT']),
  title:        z.string().min(3).max(200),
  content:      z.string().min(10).max(2000),
  locationName: z.string().max(100).optional(),
  lat:          z.number().optional(),
  lon:          z.number().optional(),
})

// POST /api/community
router.post('/', optionalAuth, validate(CreatePostSchema), asyncHandler(async (req, res) => {
  const body = req.body as z.infer<typeof CreatePostSchema>
  const post: CommunityPost = {
    id: uuidv4(),
    userId: req.user?.userId ?? 'anonymous',
    userName: 'Community Member',  // Phase 3: from user profile
    postType: body.postType as PostType,
    title: body.title,
    content: body.content,
    locationName: body.locationName,
    location: body.lat && body.lon ? { lat: body.lat, lon: body.lon } : undefined,
    reactions: { like: 0, helpful: 0, verify: 0 },
    commentsCount: 0,
    createdAt: new Date(),
    isOfficial: false,
    isVerified: false,
  }
  posts.push(post)
  const resp: ApiSuccess<CommunityPost> = { ok: true, data: post, timestamp: new Date().toISOString() }
  res.status(201).json(resp)
}))

export default router
