import type { WeatherSnapshot, WeatherForecast, HistoricalDataPoint } from '../../types';
import { cacheData, getCachedData } from '../offline/cacheService';
import { useAppStore } from '../../store';

const API_BASE = '/api';

export async function getCurrentWeather(lat: number, lon: number): Promise<WeatherSnapshot> {
  const offlineMode = useAppStore.getState().offlineMode;
  if (offlineMode || !navigator.onLine) {
    const cached = await getCachedData('weather', lat, lon);
    if (cached) {
      return { ...cached.data, isCached: true, fetchedAt: cached.fetchedAt };
    }
    throw new Error('Offline and no cached data available');
  }

  const response = await fetch(`${API_BASE}/weather/current?lat=${lat}&lon=${lon}`);
  
  if (!response.ok) {
    throw new Error('Failed to fetch weather data');
  }
  
  const payload = await response.json();
  const data = payload.data;
  
  // Convert timestamp strings back to Date objects
  if (data && data.timestamp) {
    data.timestamp = new Date(data.timestamp);
  }
  
  const locationName = useAppStore.getState().user.locationName || '';
  await cacheData('weather', lat, lon, locationName, data);
  
  return data;
}

export async function getWeatherForecast(lat: number, lon: number, days: number = 3): Promise<WeatherForecast> {
  const offlineMode = useAppStore.getState().offlineMode;
  if (offlineMode || !navigator.onLine) {
    const cached = await getCachedData('forecast', lat, lon);
    if (cached) {
      return { ...cached.data, isCached: true, fetchedAt: cached.fetchedAt };
    }
    throw new Error('Offline and no cached data available');
  }

  const response = await fetch(`${API_BASE}/weather/forecast?lat=${lat}&lon=${lon}&days=${days}`);
  
  if (!response.ok) {
    throw new Error('Failed to fetch weather forecast');
  }
  
  const payload = await response.json();
  const data = payload.data;
  
  if (data.hourly) {
    data.hourly = data.hourly.map((h: any) => ({
      ...h,
      time: new Date(h.time)
    }));
  }
  if (data.daily) {
    data.daily = data.daily.map((d: any) => ({
      ...d,
      date: new Date(d.date)
    }));
  }
  
  const locationName = useAppStore.getState().user.locationName || '';
  await cacheData('forecast', lat, lon, locationName, data);
  
  return data;
}

export async function getWeatherHistory(lat: number, lon: number, days: number = 7): Promise<HistoricalDataPoint[]> {
  const offlineMode = useAppStore.getState().offlineMode;
  if (offlineMode || !navigator.onLine) {
    const cached = await getCachedData('history', lat, lon);
    if (cached) {
      return cached.data.map((d: any) => ({ ...d, isCached: true, fetchedAt: cached.fetchedAt }));
    }
    throw new Error('Offline and no cached data available');
  }

  const response = await fetch(`${API_BASE}/weather/history?lat=${lat}&lon=${lon}&days=${days}`);
  
  if (!response.ok) {
    throw new Error('Failed to fetch weather history');
  }
  
  const payload = await response.json();
  const locationName = useAppStore.getState().user.locationName || '';
  await cacheData('history', lat, lon, locationName, payload.data || []);
  
  return payload.data || [];
}
