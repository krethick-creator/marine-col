import type { Request, Response, NextFunction } from 'express'
import type { ApiError } from '../types'

// ─── Custom error class ───────────────────────────────────────────────
export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code?: string,
    public details?: unknown
  ) {
    super(message)
    this.name = 'AppError'
  }
}

// ─── Global error handler ─────────────────────────────────────────────
export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof AppError) {
    const body: ApiError = {
      ok: false,
      error: err.message,
      code: err.code,
      details: err.details,
    }
    res.status(err.statusCode).json(body)
    return
  }

  // Zod validation errors come through as ZodError instances
  if (err.name === 'ZodError') {
    const body: ApiError = {
      ok: false,
      error: 'Validation error',
      code: 'VALIDATION_ERROR',
      details: JSON.parse(err.message),
    }
    res.status(400).json(body)
    return
  }

  // Unknown errors — don't leak internals in production
  console.error('[ERROR]', err)
  const body: ApiError = {
    ok: false,
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
    code: 'INTERNAL_ERROR',
  }
  res.status(500).json(body)
}

// ─── Async handler wrapper ────────────────────────────────────────────
// Avoids try/catch boilerplate in every route handler.
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next)
  }
}
