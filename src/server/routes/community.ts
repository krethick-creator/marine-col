import { Router } from 'express'
import { z } from 'zod'
import { v4 as uuidv4 } from 'uuid'
import { asyncHandler } from '../middleware/errorHandler'
import { validate } from '../middleware/validate'
import { requireAuth } from '../middleware/auth'
import type { ApiSuccess, CommunityPost, PostType } from '../types'
import { resolveUsersTableId } from '../utils/userPersistence'

const router = Router()

// Persistent store for real community posts (no demo/fabricated posts)
const realPosts: CommunityPost[] = []

const ListSchema = z.object({
  page: z.coerce.number().min(1).optional().default(1),
  limit: z.coerce.number().min(1).max(100).optional().default(50),
  type: z.string().optional(),
  sort: z.enum(['latest', 'oldest', 'popular']).optional().default('latest'),
  location: z.string().optional(),
  search: z.string().optional(),
})

// GET /api/community
router.get('/', validate(ListSchema, 'query'), asyncHandler(async (req, res) => {
  const { page, limit, type, sort, location, search } = req.query as unknown as z.infer<typeof ListSchema>

  let list = [...realPosts]

  // Query PostGIS table if available
  if (process.env.DATABASE_URL) {
    try {
      const { Pool } = await import('pg')
      const pool = new Pool({ connectionString: process.env.DATABASE_URL })
      const dbQuery = `
        SELECT 
          cp.id::text,
          cp.user_id,
          cp.content,
          cp.type AS post_type,
          cp.reactions,
          cp.is_official,
          cp.created_at,
          u.name AS user_name,
          u.role AS user_role,
          ST_Y(cp.location) AS lat,
          ST_X(cp.location) AS lon
        FROM community_posts cp
        LEFT JOIN users u ON cp.user_id = u.id
        ORDER BY cp.created_at DESC
        LIMIT 100;
      `
      const { rows } = await pool.query(dbQuery)
      await pool.end().catch(() => { })

      if (rows && rows.length > 0) {
        const dbPosts: CommunityPost[] = rows.map((r: any) => ({
          id: r.id,
          userId: r.user_id ? String(r.user_id) : 'anonymous',
          userName: r.user_name || 'ORCA Community Member',
          userRole: r.user_role || 'fisherman',
          postType: (r.post_type?.toUpperCase() || 'OTHER') as PostType,
          title: r.content.slice(0, 50) + (r.content.length > 50 ? '...' : ''),
          content: r.content,
          location: r.lat && r.lon ? { lat: r.lat, lon: r.lon } : undefined,
          locationName: 'Coastal Sector',
          reactions: r.reactions || { like: 0, helpful: 0, verify: 0 },
          commentsCount: 0,
          createdAt: r.created_at,
          isOfficial: Boolean(r.is_official),
          isVerified: Boolean(r.is_official),
        }))

        // Merge DB posts avoiding duplicates
        for (const p of dbPosts) {
          if (!list.some(existing => existing.id === p.id)) {
            list.push(p)
          }
        }
      }
    } catch (dbErr) {
      console.warn('[Community] PostGIS query skipped:', dbErr)
    }
  }

  // Filtering by category/type
  if (type && type !== 'ALL') {
    list = list.filter((p) => p.postType === type || p.postType.toLowerCase() === type.toLowerCase())
  }

  // Filtering by location
  if (location && location.trim() !== '') {
    const locLower = location.toLowerCase().trim()
    list = list.filter((p) => p.locationName?.toLowerCase().includes(locLower))
  }

  // Search by text query
  if (search && search.trim() !== '') {
    const q = search.toLowerCase().trim()
    list = list.filter((p) => p.title.toLowerCase().includes(q) || p.content.toLowerCase().includes(q) || p.userName.toLowerCase().includes(q) || p.locationName?.toLowerCase().includes(q))
  }

  // Sorting
  if (sort === 'oldest') {
    list.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
  } else if (sort === 'popular') {
    list.sort((a, b) => {
      const popA = (a.reactions?.like || 0) + (a.reactions?.helpful || 0) + (a.reactions?.verify || 0)
      const popB = (b.reactions?.like || 0) + (b.reactions?.helpful || 0) + (b.reactions?.verify || 0)
      return popB - popA
    })
  } else {
    // Default: 'latest'
    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }

  const start = (page - 1) * limit
  const paginated = list.slice(start, start + limit)

  res.json({
    ok: true,
    data: paginated,
    total: list.length,
    isMockData: false,
    timestamp: new Date().toISOString()
  })
}))

const CreatePostSchema = z.object({
  postType: z.enum(['OBSERVATION', 'CONDITION_REPORT', 'ZONE_REPORT', 'DANGER_REPORT', 'OTHER']),
  title: z.string().min(3).max(200),
  content: z.string().min(10).max(2000),
  locationName: z.string().max(100).optional(),
  lat: z.number().optional(),
  lon: z.number().optional(),
  userName: z.string().optional(),
  userRole: z.string().optional(),
})

// POST /api/community
router.post('/', requireAuth, validate(CreatePostSchema), asyncHandler(async (req, res) => {
  const body = req.body as z.infer<typeof CreatePostSchema>
  const authUser = req.user!

  const authorName = body.userName || authUser.name || 'Community Mariner'
  const authorRole = body.userRole || authUser.role || 'Fisherman'

  const newPost: CommunityPost = {
    id: `post-${uuidv4()}`,
    userId: String(authUser.userId),
    userName: authorName,
    userRole: authorRole,
    postType: body.postType as PostType,
    title: body.title,
    content: body.content,
    locationName: body.locationName || 'Local Coastal Region',
    location: body.lat && body.lon ? { lat: body.lat, lon: body.lon } : undefined,
    reactions: { like: 0, helpful: 0, verify: 0 },
    commentsCount: 0,
    createdAt: new Date(),
    isOfficial: false,
    isVerified: false,
  }

  // Handle PostgreSQL persistence if DATABASE_URL is set
  if (process.env.DATABASE_URL) {
    const { Pool } = await import('pg')
    const pool = new Pool({ connectionString: process.env.DATABASE_URL })

    try {
      const dbUserId = await resolveUsersTableId({
        userId: String(authUser.userId),
        email: authUser.email,
        name: authUser.name || authorName,
        role: authUser.role || authorRole,
      })

      if (!dbUserId) {
        await pool.end().catch(() => { })
        res.status(400).json({
          ok: false,
          error: 'Could not link this session to a users table row. Please try posting again.',
          code: 'USER_RESOLVE_ERROR'
        })
        return
      }

      newPost.userId = String(dbUserId)

      const insertQuery = `
        INSERT INTO community_posts (content, type, location, reactions, is_official, user_id)
        VALUES ($1, $2, ST_SetSRID(ST_MakePoint($3, $4), 4326), $5, false, $6)
        RETURNING id, created_at;
      `
      const dbRes = await pool.query(insertQuery, [
        `${newPost.title}\n\n${newPost.content}`,
        newPost.postType.toLowerCase(),
        body.lon || 80.2707,
        body.lat || 13.0827,
        JSON.stringify(newPost.reactions),
        dbUserId
      ])
      await pool.end().catch(() => { })

      if (dbRes.rows && dbRes.rows.length > 0) {
        newPost.id = String(dbRes.rows[0].id)
        newPost.createdAt = dbRes.rows[0].created_at
      }
    } catch (dbErr: any) {
      await pool.end().catch(() => { })
      console.error('[Community] PostgreSQL insert error:', dbErr)
      res.status(400).json({
        ok: false,
        error: `Failed to create community post: ${dbErr.message || 'Database foreign key error'}`,
        code: 'DB_INSERT_ERROR'
      })
      return
    }
  }

  realPosts.unshift(newPost)
  const resp: ApiSuccess<CommunityPost> = { ok: true, data: newPost, isMockData: false, timestamp: new Date().toISOString() }
  res.status(201).json(resp)
}))

// POST /api/community/:id/react
router.post('/:id/react', asyncHandler(async (req, res) => {
  const { id } = req.params
  const { type } = req.body as { type: 'like' | 'helpful' | 'verify' }

  const post = realPosts.find(p => p.id === id)
  if (post) {
    if (!post.reactions) post.reactions = { like: 0, helpful: 0, verify: 0 }
    if (type === 'like' || type === 'helpful' || type === 'verify') {
      post.reactions[type] = (post.reactions[type] || 0) + 1
    }
    res.json({ ok: true, data: post, timestamp: new Date().toISOString() })
    return
  }

  res.status(404).json({ ok: false, error: 'Post not found' })
}))

export default router
