import { create } from 'zustand'
import type { ChatMessage, UserProfile, WeatherSnapshot, Alert } from '../types'
import { mockWeather, mockAlerts } from '../services/mockProviders/mockData'

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
  toggleOfflineMode: () => void

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

export const useAppStore = create<AppStore>((set) => ({
  activePage: 'home',
  setActivePage: (page) => set({ activePage: page }),

  user: {
    id: 'demo-user-1',
    name: 'Ramesh K.',
    role: 'FISHERMAN',
    locationName: 'Chennai Coast',
    location: { lat: 13.0827, lon: 80.2707 },
    language: 'en',
    offlineMode: false,
  },
  setUser: (partial) =>
    set((s) => ({ user: { ...s.user, ...partial } })),

  offlineMode: false,
  toggleOfflineMode: () =>
    set((s) => ({
      offlineMode: !s.offlineMode,
      user: { ...s.user, offlineMode: !s.offlineMode },
    })),

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

  alerts: mockAlerts,
  setAlerts: (a) => set({ alerts: a, unreadAlertCount: a.length }),
  unreadAlertCount: mockAlerts.length,
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
