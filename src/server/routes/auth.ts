import { Router } from 'express'
import { z } from 'zod'
import { asyncHandler } from '../middleware/errorHandler'
import { validate } from '../middleware/validate'
import { signToken } from '../middleware/auth'
import type { ApiSuccess } from '../types'
import { v4 as uuidv4 } from 'uuid'
import fs from 'fs'
import path from 'path'

const router = Router()

// Use a local JSON file for real data persistence without requiring PostgreSQL setup
const USERS_FILE = path.join(process.cwd(), 'users.json');

// Helper to read users from disk
function getUsers() {
  if (!fs.existsSync(USERS_FILE)) {
    fs.writeFileSync(USERS_FILE, JSON.stringify([]));
  }
  return JSON.parse(fs.readFileSync(USERS_FILE, 'utf-8'));
}

// Helper to save users to disk
function saveUsers(users: any[]) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

const LoginSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(6),
})

// POST /api/auth/login
router.post('/login', validate(LoginSchema), asyncHandler(async (req, res) => {
  const { email, password } = req.body as z.infer<typeof LoginSchema>

  const users = getUsers();
  const user = users.find((u: any) => u.email === email && u.password === password);

  if (!user) {
    res.status(401).json({ ok: false, error: 'Invalid credentials', code: 'AUTH_INVALID' })
    return
  }

  const token = signToken({ userId: user.id, role: user.role })
  const data = { token, user: { id: user.id, name: user.name, role: user.role } }
  const body: ApiSuccess<typeof data> = { ok: true, data, timestamp: new Date().toISOString() }
  res.json(body)
}))

const RegisterSchema = z.object({
  name:     z.string().min(2).max(100),
  email:    z.string().email(),
  password: z.string().min(8),
  role:     z.enum(['FISHERMAN', 'RESEARCHER', 'OFFICIAL', 'Fisherman', 'Marine Researcher', 'Coastal Officer', 'Maritime Operator', 'Other']).optional().default('Fisherman'),
})

// POST /api/auth/register
router.post('/register', validate(RegisterSchema), asyncHandler(async (req, res) => {
  const body = req.body as z.infer<typeof RegisterSchema>
  
  const users = getUsers();
  const existingUser = users.find((u: any) => u.email === body.email);
  
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
  
  const token = signToken({ userId: newUser.id, role: newUser.role })
  const data = { token, message: 'Registration successful', user: { id: newUser.id, name: newUser.name, role: newUser.role } }
  res.status(201).json({ ok: true, data, timestamp: new Date().toISOString() })
}))

export default router
