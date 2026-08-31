import { env } from '../../config/env'
import type { AdvisoryProvider } from './AdvisoryProvider'
import { MockAdvisoryProvider } from './MockAdvisoryProvider'
import { RealAdvisoryProvider } from './RealAdvisoryProvider'

let instance: AdvisoryProvider | null = null

export function getAdvisoryProvider(): AdvisoryProvider {
  if (!instance) {
    if (env.useMockData) {
      instance = new MockAdvisoryProvider()
      console.log('[Advisory] Using MockAdvisoryProvider (DEMO DATA)')
    } else {
      console.log('[Advisory] Using RealAdvisoryProvider (REAL DATA)')
      instance = new RealAdvisoryProvider()
    }
  }
  return instance
}

export type { AdvisoryProvider }
