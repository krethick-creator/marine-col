import { env } from '../../config/env'
import type { AdvisoryProvider } from './AdvisoryProvider'
import { MockAdvisoryProvider } from './MockAdvisoryProvider'

let instance: AdvisoryProvider | null = null

export function getAdvisoryProvider(): AdvisoryProvider {
  if (!instance) {
    if (env.useMockData) {
      instance = new MockAdvisoryProvider()
      console.log('[Advisory] Using MockAdvisoryProvider (DEMO DATA)')
    } else {
      console.warn('[Advisory] Real provider not yet implemented — falling back to mock')
      instance = new MockAdvisoryProvider()
    }
  }
  return instance
}

export type { AdvisoryProvider }
