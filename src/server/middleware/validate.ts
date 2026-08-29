import type { Request, Response, NextFunction } from 'express'
import { ZodSchema } from 'zod'
import { AppError } from './errorHandler'

// ─── Zod request body validator ───────────────────────────────────────
// Usage: router.post('/route', validate(MySchema), handler)
export function validate<T>(schema: ZodSchema<T>, target: 'body' | 'query' | 'params' = 'body') {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[target])
    if (!result.success) {
      throw new AppError(400, 'Validation error', 'VALIDATION_ERROR', result.error.flatten())
    }
    // Attach parsed data back (overwrites with coerced values)
    ;(req as unknown as Record<string, unknown>)[target] = result.data
    next()
  }
}
