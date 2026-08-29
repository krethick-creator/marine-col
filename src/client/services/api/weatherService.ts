import type { WeatherSnapshot } from '../../types';

const API_BASE = '/api';

export async function getCurrentWeather(lat: number, lon: number): Promise<WeatherSnapshot> {
  const response = await fetch(`${API_BASE}/weather/current?lat=${lat}&lon=${lon}`);
  
  if (!response.ok) {
    throw new Error('Failed to fetch weather data');
  }
  
  const data = await response.json();
  
  // Convert timestamp strings back to Date objects
  if (data.timestamp) {
    data.timestamp = new Date(data.timestamp);
  }
  
  return data;
}
