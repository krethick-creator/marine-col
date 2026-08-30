import type { Request, Response, NextFunction } from 'express'
import { ZodSchema } from 'zod'
import { AppError } from './errorHandler'

// ─── Zod request validator ──────────────────────────────────────────────
// Usage: router.post('/route', validate(MySchema), handler)
// In Express 5, req.query is a getter-only property on the prototype.
// We use Object.defineProperty on the request instance to override the getter safely,
// and also attach validated fields (e.g. req.validatedQuery, req.validatedData).
export function validate<T>(schema: ZodSchema<T>, target: 'body' | 'query' | 'params' = 'body') {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[target])
    if (!result.success) {
      throw new AppError(400, 'Validation error', 'VALIDATION_ERROR', result.error.flatten())
    }
    
    // Safely define property on the instance for Express 5 compatibility
    try {
      Object.defineProperty(req, target, {
        value: result.data,
        writable: true,
        configurable: true,
        enumerable: true,
      })
    } catch {
      ;(req as unknown as Record<string, unknown>)[target] = result.data
    }

    // Also attach to dedicated helper fields
    const reqAny = req as unknown as Record<string, unknown>
    reqAny.validatedData = result.data
    if (target === 'query') {
      reqAny.validatedQuery = result.data
    } else if (target === 'body') {
      reqAny.validatedBody = result.data
    } else if (target === 'params') {
      reqAny.validatedParams = result.data
    }

    next()
  }
}

