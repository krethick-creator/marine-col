import type { WeatherSnapshot } from '../../types';
export declare function getCurrentWeather(lat: number, lon: number): Promise<WeatherSnapshot>;
