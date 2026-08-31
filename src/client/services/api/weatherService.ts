import type { WeatherSnapshot, WeatherForecast, HistoricalDataPoint } from '../../types';

const API_BASE = '/api';

export async function getCurrentWeather(lat: number, lon: number): Promise<WeatherSnapshot> {
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
  
  return data;
}

export async function getWeatherForecast(lat: number, lon: number, days: number = 3): Promise<WeatherForecast> {
  const response = await fetch(`${API_BASE}/weather/forecast?lat=${lat}&lon=${lon}&days=${days}`);
  
  if (!response.ok) {
    throw new Error('Failed to fetch weather forecast');
  }
  
  const payload = await response.json();
  const data = payload.data;
  
  // Convert Date strings to Date objects
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
  
  return data;
}

export async function getWeatherHistory(lat: number, lon: number, days: number = 7): Promise<HistoricalDataPoint[]> {
  const response = await fetch(`${API_BASE}/weather/history?lat=${lat}&lon=${lon}&days=${days}`);
  
  if (!response.ok) {
    throw new Error('Failed to fetch weather history');
  }
  
  const payload = await response.json();
  return payload.data || [];
}

export interface GeocodingResult {
  name: string;
  lat: number;
  lon: number;
  state?: string;
  country?: string;
}

export async function searchLocation(query: string): Promise<GeocodingResult[]> {
  const response = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5&addressdetails=1`);
  if (!response.ok) {
    throw new Error('Failed to search location');
  }
  const data = await response.json();
  return data.map((item: any) => ({
    name: item.name || item.display_name.split(',')[0],
    lat: parseFloat(item.lat),
    lon: parseFloat(item.lon),
    state: item.address?.state,
    country: item.address?.country
  }));
}
