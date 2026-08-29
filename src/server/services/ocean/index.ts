import { env } from '../../config/env'
import type { OceanProvider } from './OceanProvider'
import { MockOceanProvider } from './MockOceanProvider'

let instance: OceanProvider | null = null

export function getOceanProvider(): OceanProvider {
  if (!instance) {
    if (env.useMockData) {
      instance = new MockOceanProvider()
      console.log('[Ocean] Using MockOceanProvider (DEMO DATA)')
    } else {
      console.warn('[Ocean] Real provider not yet implemented — falling back to mock')
      instance = new MockOceanProvider()
    }
  }
  return instance
}

export type { OceanProvider }
