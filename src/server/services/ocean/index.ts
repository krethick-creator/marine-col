import { env } from '../../config/env'
import type { OceanProvider } from './OceanProvider'
import { MockOceanProvider } from './MockOceanProvider'
import { OpenMeteoOceanProvider } from './OpenMeteoOceanProvider'

let instance: OceanProvider | null = null

export function getOceanProvider(): OceanProvider {
  if (!instance) {
    if (env.useMockData) {
      instance = new MockOceanProvider()
      console.log('[Ocean] Using MockOceanProvider (DEMO DATA)')
    } else {
      instance = new OpenMeteoOceanProvider()
      console.log('[Ocean] Using OpenMeteoOceanProvider (REAL DATA)')
    }
  }
  return instance
}

export type { OceanProvider }
