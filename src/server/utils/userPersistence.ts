import fs from 'fs'
import path from 'path'

const USERS_FILE = path.join(process.cwd(), 'users.json')

export interface PersistedUser {
  id: string
  email: string
  password?: string
  name: string
  role: string
}

export function getUsers(): PersistedUser[] {
  if (!fs.existsSync(USERS_FILE)) {
    fs.writeFileSync(USERS_FILE, JSON.stringify([]))
  }
  return JSON.parse(fs.readFileSync(USERS_FILE, 'utf-8'))
}

export function saveUsers(users: PersistedUser[]): void {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2))
}

export async function syncUserToDatabase(user: PersistedUser): Promise<{
  id: string
  email: string
  name: string
  role: string
}> {
  if (!process.env.DATABASE_URL) {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: (user.role || 'FISHERMAN').toString().toUpperCase(),
    }
  }

  const { Pool } = await import('pg')
  const pool = new Pool({ connectionString: process.env.DATABASE_URL })

  try {
    const role = (user.role || 'FISHERMAN').toString().toUpperCase()
    const result = await pool.query(
      `
        INSERT INTO users (email, password, name, role)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (email) DO UPDATE SET
          password = EXCLUDED.password,
          name = EXCLUDED.name,
          role = EXCLUDED.role
        RETURNING id, email, name, role;
      `,
      [user.email, user.password || '', user.name, role]
    )

    const row = result.rows[0]
    if (row) {
      return {
        id: String(row.id),
        email: row.email,
        name: row.name,
        role: row.role,
      }
    }

    const fallback = await pool.query('SELECT id, email, name, role FROM users WHERE email = $1 LIMIT 1', [user.email])
    const fallbackRow = fallback.rows[0]
    if (!fallbackRow) {
      throw new Error('User sync failed: no matching database row was created')
    }

    return {
      id: String(fallbackRow.id),
      email: fallbackRow.email,
      name: fallbackRow.name,
      role: fallbackRow.role,
    }
  } finally {
    await pool.end().catch(() => { })
  }
}

export function persistSyncedUserId(localUserId: string, dbUserId: string): void {
  if (!dbUserId || localUserId === dbUserId) return
  const users = getUsers()
  const user = users.find((u) => String(u.id) === String(localUserId))
  if (user) {
    user.id = dbUserId
    saveUsers(users)
  }
}

export async function resolveUsersTableId(opts: {
  userId: string
  email?: string
  name?: string
  role?: string
}): Promise<number | null> {
  const fileUsers = getUsers()
  const fileUser =
    fileUsers.find((u) => String(u.id) === String(opts.userId)) ||
    (opts.email ? fileUsers.find((u) => u.email === opts.email) : undefined)

  if (fileUser) {
    const synced = await syncUserToDatabase(fileUser)
    persistSyncedUserId(fileUser.id, synced.id)
    const numeric = Number(synced.id)
    if (Number.isInteger(numeric) && numeric > 0) return numeric
  }

  if (!process.env.DATABASE_URL) {
    const numeric = Number(opts.userId)
    return Number.isInteger(numeric) && numeric > 0 ? numeric : null
  }

  const { Pool } = await import('pg')
  const pool = new Pool({ connectionString: process.env.DATABASE_URL })
  try {
    const numeric = Number(opts.userId)
    if (Number.isInteger(numeric) && numeric > 0) {
      const byId = await pool.query('SELECT id FROM users WHERE id = $1 LIMIT 1', [numeric])
      if (byId.rows[0]) return Number(byId.rows[0].id)
    }

    if (opts.email) {
      const synced = await syncUserToDatabase({
        id: String(opts.userId),
        email: opts.email,
        name: opts.name || 'Community Mariner',
        role: (opts.role || 'FISHERMAN').toString().toUpperCase(),
      })
      const syncedId = Number(synced.id)
      if (Number.isInteger(syncedId) && syncedId > 0) return syncedId
    }
  } finally {
    await pool.end().catch(() => { })
  }

  return null
}
