import { Router } from 'express'
import { z } from 'zod'
import { asyncHandler } from '../middleware/errorHandler'
import { validate } from '../middleware/validate'
import { requireAuth, signToken } from '../middleware/auth'
import type { ApiSuccess } from '../types'
import { v4 as uuidv4 } from 'uuid'
import { getUsers, persistSyncedUserId, saveUsers, syncUserToDatabase } from '../utils/userPersistence'

const router = Router()

function setAuthCookie(res: { setHeader: (name: string, value: string) => void }, token: string) {
  res.setHeader('Set-Cookie', `orca_token=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax`)
}

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
})

// POST /api/auth/login
router.post('/login', validate(LoginSchema), asyncHandler(async (req, res) => {
  const { email, password } = req.body as z.infer<typeof LoginSchema>

  const users = getUsers();
  const user = users.find((u) => u.email === email && u.password === password);

  if (!user) {
    res.status(401).json({ ok: false, error: 'Invalid credentials', code: 'AUTH_INVALID' })
    return
  }

  const syncedUser = await syncUserToDatabase(user)
  persistSyncedUserId(user.id, syncedUser.id)
  const token = signToken({
    userId: syncedUser.id,
    role: syncedUser.role,
    email: syncedUser.email,
    name: syncedUser.name,
  })
  setAuthCookie(res, token)
  const data = {
    token,
    user: {
      id: syncedUser.id,
      name: syncedUser.name,
      email: syncedUser.email,
      role: syncedUser.role,
    },
  }
  const body: ApiSuccess<typeof data> = { ok: true, data, timestamp: new Date().toISOString() }
  res.json(body)
}))

const RegisterSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(['FISHERMAN', 'RESEARCHER', 'OFFICIAL', 'Fisherman', 'Marine Researcher', 'Coastal Officer', 'Maritime Operator', 'Other']).optional().default('Fisherman'),
})

// POST /api/auth/register
router.post('/register', validate(RegisterSchema), asyncHandler(async (req, res) => {
  const body = req.body as z.infer<typeof RegisterSchema>

  const users = getUsers();
  const existingUser = users.find((u) => u.email === body.email);

  if (existingUser) {
    res.status(400).json({ ok: false, error: 'Email already exists', code: 'AUTH_EXISTS' })
    return
  }

  const newUser = {
    id: uuidv4(),
    name: body.name,
    email: body.email,
    password: body.password,
    role: body.role.toUpperCase(),
  };

  users.push(newUser);
  saveUsers(users);

  const syncedUser = await syncUserToDatabase(newUser)
  persistSyncedUserId(newUser.id, syncedUser.id)
  const token = signToken({
    userId: syncedUser.id,
    role: syncedUser.role,
    email: syncedUser.email,
    name: syncedUser.name,
  })
  setAuthCookie(res, token)
  const data = {
    token,
    message: 'Registration successful',
    user: {
      id: syncedUser.id,
      name: syncedUser.name,
      email: syncedUser.email,
      role: syncedUser.role,
    },
  }
  res.status(201).json({ ok: true, data, timestamp: new Date().toISOString() })
}))

// GET /api/auth/me
router.get('/me', requireAuth, asyncHandler(async (req, res) => {
  const tokenUser = req.user!
  const users = getUsers()
  const fileUser =
    users.find((u) => String(u.id) === String(tokenUser.userId)) ||
    users.find((u) => tokenUser.email && u.email === tokenUser.email)

  const user = {
    id: tokenUser.userId,
    name: fileUser?.name || tokenUser.name || 'ORCA User',
    email: fileUser?.email || tokenUser.email || '',
    role: fileUser?.role || tokenUser.role || 'FISHERMAN',
  }

  const body: ApiSuccess<typeof user> = { ok: true, data: user, timestamp: new Date().toISOString() }
  res.json(body)
}))

// POST /api/auth/logout
router.post('/logout', asyncHandler(async (_req, res) => {
  res.setHeader('Set-Cookie', 'orca_token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0')
  res.json({ ok: true, data: { success: true }, timestamp: new Date().toISOString() })
}))

export default router
