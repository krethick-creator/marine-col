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

// ─── Require auth ─────────────────────────────────────────────────────
export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    throw new AppError(401, 'Authentication required', 'AUTH_REQUIRED')
  }

  const token = header.slice(7)
  try {
    const payload = jwt.verify(token, env.jwtSecret) as JWTPayload
    req.user = payload
    next()
  } catch {
    throw new AppError(401, 'Invalid or expired token', 'AUTH_INVALID')
  }
}

// ─── Optional auth ────────────────────────────────────────────────────
// Attaches user if token is present; continues without error if not.
export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization
  if (header?.startsWith('Bearer ')) {
    try {
      const token = header.slice(7)
      req.user = jwt.verify(token, env.jwtSecret) as JWTPayload
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
