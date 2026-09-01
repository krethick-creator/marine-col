import type { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { env } from '../config/env'
import type { JWTPayload } from '../types'
import { AppError } from './errorHandler'

// Extend Express Request to include the decoded user
declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload
    }
  }
}

function extractToken(req: Request): string | undefined {
  const header = req.headers.authorization
  if (header?.startsWith('Bearer ')) {
    return header.slice(7)
  }

  const cookieHeader = req.headers.cookie
  if (!cookieHeader) return undefined
  const match = cookieHeader.match(/(?:^|;\s*)(?:token|orca_token)=([^;]+)/)
  return match ? decodeURIComponent(match[1]) : undefined
}

function decodePayload(token: string): JWTPayload {
  const payload = jwt.verify(token, env.jwtSecret) as JWTPayload & { sub?: string }
  const userId = typeof payload.userId !== 'undefined' ? String(payload.userId) : String(payload.sub ?? '')
  if (!userId) {
    throw new AppError(401, 'Invalid or expired token', 'AUTH_INVALID')
  }
  return { ...payload, userId }
}

// ─── Require auth ─────────────────────────────────────────────────────
export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const token = extractToken(req)
  if (!token) {
    throw new AppError(401, 'Authentication required', 'AUTH_REQUIRED')
  }

  try {
    req.user = decodePayload(token)
    next()
  } catch (err) {
    if (err instanceof AppError) throw err
    throw new AppError(401, 'Invalid or expired token', 'AUTH_INVALID')
  }
}

// ─── Optional auth ────────────────────────────────────────────────────
// Attaches user if token is present; continues without error if not.
export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  const token = extractToken(req)
  if (token) {
    try {
      req.user = decodePayload(token)
    } catch {
      // Ignore invalid tokens for optional auth
    }
  }
  next()
}

// ─── Sign token ───────────────────────────────────────────────────────
export function signToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, env.jwtSecret, { expiresIn: env.jwtExpiresIn } as jwt.SignOptions)
}
