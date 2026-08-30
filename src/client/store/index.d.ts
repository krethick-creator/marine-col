import type { ChatMessage, UserProfile, WeatherSnapshot, Alert } from '../types';
interface AppStore {
    activePage: string;
    setActivePage: (page: string) => void;
    user: UserProfile;
    setUser: (user: Partial<UserProfile>) => void;
    offlineMode: boolean;
    toggleOfflineMode: () => void;
    currentWeather: WeatherSnapshot | null;
    weatherLoading: boolean;
    weatherError: string | null;
    setCurrentWeather: (w: WeatherSnapshot | null) => void;
    fetchWeather: (lat: number, lon: number) => Promise<void>;
    alerts: Alert[];
    setAlerts: (a: Alert[]) => void;
    unreadAlertCount: number;
    clearAlertBadge: () => void;
}
export declare const useAppStore: import("zustand").UseBoundStore<import("zustand").StoreApi<AppStore>>;
interface ChatStore {
    messages: ChatMessage[];
    isLoading: boolean;
    currentAgentIndex: number;
    addMessage: (msg: ChatMessage) => void;
    updateMessage: (id: string, partial: Partial<ChatMessage>) => void;
    setLoading: (loading: boolean) => void;
    setAgentIndex: (idx: number) => void;
    clearChat: () => void;
}
export declare const useChatStore: import("zustand").UseBoundStore<import("zustand").StoreApi<ChatStore>>;
export {};
