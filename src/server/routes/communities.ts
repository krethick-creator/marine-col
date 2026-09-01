import { Router } from 'express'
import { z } from 'zod'
import { v4 as uuidv4 } from 'uuid'
import { asyncHandler } from '../middleware/errorHandler'
import { analyzeCommunityReports } from '../agents/CommunityIntelligenceAgent'
import { validate } from '../middleware/validate'
import { optionalAuth } from '../middleware/auth'
import { posts } from './community'

const router = Router()

export interface Community {
  id: string
  name: string
  description: string
  locationName: string
  createdBy: string
  members: string[]
  createdAt: Date
}

const communities: Community[] = [
  {
    id: uuidv4(),
    name: 'Puducherry Fishermen',
    description:
      'Local marine conditions, fishing activity and safety reports.',
    locationName: 'Puducherry Coast',
    createdBy: 'demo-u1',
    members: ['demo-u1', 'demo-u2'],
    createdAt: new Date(),
  },
]

const CreateCommunitySchema = z.object({
  name: z.string().min(3).max(100),
  description: z.string().min(10).max(500),
  locationName: z.string().min(2).max(100),
})

// GET /api/communities
router.get(
  '/',
  asyncHandler(async (_req, res) => {
    const data = communities.map((community) => ({
      ...community,
      membersCount: community.members.length,
    }))

    res.json({
      ok: true,
      data,
      timestamp: new Date().toISOString(),
    })
  }),
)

// POST /api/communities
router.post(
  '/',
  optionalAuth,
  validate(CreateCommunitySchema),
  asyncHandler(async (req, res) => {
    const body = req.body as z.infer<typeof CreateCommunitySchema>

    const userId = req.user?.userId ?? 'anonymous'

    const community: Community = {
      id: uuidv4(),
      name: body.name,
      description: body.description,
      locationName: body.locationName,
      createdBy: userId,
      members: [userId],
      createdAt: new Date(),
    }

    communities.push(community)

    res.status(201).json({
      ok: true,
      data: {
        ...community,
        membersCount: community.members.length,
      },
      timestamp: new Date().toISOString(),
    })
  }),
)

// POST /api/communities/:id/join
router.post(
  '/:id/join',
  optionalAuth,
  asyncHandler(async (req, res) => {
    const community = communities.find(
      (c) => c.id === req.params.id,
    )

    if (!community) {
      return res.status(404).json({
        ok: false,
        error: 'Community not found',
      })
    }

    const userId = req.user?.userId ?? 'anonymous'

    if (!community.members.includes(userId)) {
      community.members.push(userId)
    }

    res.json({
      ok: true,
      data: {
        ...community,
        membersCount: community.members.length,
      },
      timestamp: new Date().toISOString(),
    })
  }),
)

// POST /api/communities/intelligence
router.post(
  '/intelligence',
  asyncHandler(async (req, res) => {
    const { communityId } = req.body

    if (!communityId) {
      return res.status(400).json({
        ok: false,
        error: 'communityId is required',
      })
    }

    const community = communities.find(
      (community) => community.id === communityId,
    )

    if (!community) {
      return res.status(404).json({
        ok: false,
        error: 'Community not found',
      })
    }

    // Analyze the existing community reports
    const intelligence = await analyzeCommunityReports(posts)

    res.json({
      ok: true,
      data: {
        communityId: community.id,
        communityName: community.name,
        locationName: community.locationName,
        reportsAnalyzed: posts.length,
        intelligence,
      },
      timestamp: new Date().toISOString(),
    })
  }),
)

export default router