import { create } from 'zustand'
import type { ChatMessage, UserProfile, WeatherSnapshot, Alert } from '../types'

// Helper to retrieve initial location from localStorage
const getInitialLocation = () => {
  const lat = localStorage.getItem('orca_lat')
  const lon = localStorage.getItem('orca_lon')
  const name = localStorage.getItem('orca_loc_name')
  const district = localStorage.getItem('orca_loc_district') || ''
  const state = localStorage.getItem('orca_loc_state') || ''
  const country = localStorage.getItem('orca_loc_country') || ''
  
  if (lat && lon && name) {
    return {
      location: { lat: parseFloat(lat), lon: parseFloat(lon) },
      locationName: name,
      locationDetails: { district, state, country }
    }
  }
  return {
    location: undefined,
    locationName: '',
    locationDetails: { district: '', state: '', country: '' }
  }
}

const initialLoc = getInitialLocation()

// ─── App Store ─────────────────────────────────────────────────────────
interface AppStore {
  // Navigation
  activePage: string
  setActivePage: (page: string) => void

  // User
  user: UserProfile
  setUser: (user: Partial<UserProfile>) => void

  // Offline mode
  offlineMode: boolean
  setOfflineMode: (offline: boolean) => void
  toggleOfflineMode: () => void
  lastSyncTime: Date | null
  setLastSyncTime: (time: Date) => void

  // PWA Install Prompt
  deferredPrompt: any | null
  setDeferredPrompt: (prompt: any) => void
  isInstallable: boolean
  setIsInstallable: (installable: boolean) => void
  isAppInstalled: boolean
  setIsAppInstalled: (installed: boolean) => void

  // Location Selector
  showLocationModal: boolean
  setShowLocationModal: (show: boolean) => void
  locationLoading: boolean
  locationError: string | null
  setLocation: (lat: number, lon: number, name: string, district?: string, state?: string, country?: string) => void

  // Weather (sidebar widget)
  currentWeather: WeatherSnapshot | null
  weatherLoading: boolean
  weatherError: string | null
  setCurrentWeather: (w: WeatherSnapshot | null) => void
  fetchWeather: (lat: number, lon: number) => Promise<void>

  // Alerts badge count
  alerts: Alert[]
  setAlerts: (a: Alert[]) => void
  unreadAlertCount: number
  clearAlertBadge: () => void
}

import { getCurrentWeather } from '../services/api/weatherService'

export const useAppStore = create<AppStore>((set, get) => ({
  activePage: 'home',
  setActivePage: (page) => set({ activePage: page }),

  user: {
    id: 'demo-user-1',
    name: 'Ramesh K.',
    role: 'FISHERMAN',
    locationName: initialLoc.locationName,
    location: initialLoc.location,
    locationDetails: initialLoc.locationDetails,
    language: 'en',
    offlineMode: false,
  } as any,
  setUser: (partial) =>
    set((s) => ({ user: { ...s.user, ...partial } })),

  offlineMode: !navigator.onLine,
  setOfflineMode: (offline) => 
    set((s) => ({
      offlineMode: offline,
      user: { ...s.user, offlineMode: offline },
    })),
  toggleOfflineMode: () =>
    set((s) => ({
      offlineMode: !s.offlineMode,
      user: { ...s.user, offlineMode: !s.offlineMode },
    })),
  lastSyncTime: new Date(),
  setLastSyncTime: (time) => set({ lastSyncTime: time }),

  deferredPrompt: null,
  setDeferredPrompt: (prompt) => set({ deferredPrompt: prompt }),
  isInstallable: false,
  setIsInstallable: (installable) => set({ isInstallable: installable }),
  isAppInstalled: false,
  setIsAppInstalled: (installed) => set({ isAppInstalled: installed }),

  showLocationModal: !initialLoc.location,
  setShowLocationModal: (show) => set({ showLocationModal: show }),
  locationLoading: false,
  locationError: null,
  setLocation: (lat, lon, name, district = '', state = '', country = '') => {
    localStorage.setItem('orca_lat', lat.toString())
    localStorage.setItem('orca_lon', lon.toString())
    localStorage.setItem('orca_loc_name', name)
    if (district) localStorage.setItem('orca_loc_district', district)
    if (state) localStorage.setItem('orca_loc_state', state)
    if (country) localStorage.setItem('orca_loc_country', country)
    
    set((s) => ({
      user: {
        ...s.user,
        location: { lat, lon },
        locationName: name,
        locationDetails: { district, state, country }
      } as any,
      showLocationModal: false,
      locationError: null,
    }))
    // Refetch weather immediately for the new location
    get().fetchWeather(lat, lon)
  },

  currentWeather: null,
  weatherLoading: false,
  weatherError: null,
  setCurrentWeather: (w) => set({ currentWeather: w }),
  fetchWeather: async (lat: number, lon: number) => {
    set({ weatherLoading: true, weatherError: null })
    try {
      const data = await getCurrentWeather(lat, lon)
      set({ currentWeather: data, weatherLoading: false })
    } catch (err: any) {
      set({ weatherError: err.message, weatherLoading: false })
    }
  },

  alerts: [],
  setAlerts: (a) => set({ alerts: a, unreadAlertCount: a.length }),
  unreadAlertCount: 0,
  clearAlertBadge: () => set({ unreadAlertCount: 0 }),
}))

// ─── Chat Store ────────────────────────────────────────────────────────
interface ChatStore {
  messages: ChatMessage[]
  isLoading: boolean
  currentAgentIndex: number    // which agent step is running

  addMessage: (msg: ChatMessage) => void
  updateMessage: (id: string, partial: Partial<ChatMessage>) => void
  setLoading: (loading: boolean) => void
  setAgentIndex: (idx: number) => void
  clearChat: () => void
}

export const useChatStore = create<ChatStore>((set) => ({
  messages: [],
  isLoading: false,
  currentAgentIndex: -1,

  addMessage: (msg) =>
    set((s) => ({ messages: [...s.messages, msg] })),

  updateMessage: (id, partial) =>
    set((s) => ({
      messages: s.messages.map((m) => (m.id === id ? { ...m, ...partial } : m)),
    })),
  setLoading: (loading) => set({ isLoading: loading }),

  setAgentIndex: (idx) => set({ currentAgentIndex: idx }),

  clearChat: () => set({ messages: [], currentAgentIndex: -1, isLoading: false }),
}))
