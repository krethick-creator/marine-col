export const ProviderStatus = {
  REAL_DATA_SUCCESS: 'REAL_DATA_SUCCESS',
  REAL_DATA_EMPTY: 'REAL_DATA_EMPTY',
  PROVIDER_UNAVAILABLE: 'PROVIDER_UNAVAILABLE',
  MOCK_DATA: 'MOCK_DATA',
} as const

export type ProviderStatus = typeof ProviderStatus[keyof typeof ProviderStatus]
