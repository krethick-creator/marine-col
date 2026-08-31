/**
 * Safe Route Result - data structure returned from the Route Agent API
 * Represents a calculated weather-aware maritime route from origin to destination
 */
import { useAppStore } from '../../store';

export interface SafeRouteResult {
    success: boolean
    status: 'GO' | 'CAUTION' | 'NO-GO'
    reason?: string
    error?: string
    boat: string
    boatKey: string
    departureTime: string
    waypoints: [number, number][] // [lat, lon] pairs
    distanceKm: number
    straightLineDistanceKm: number
    travelTimeMinutes: number
    maxWaveHeight: number
    maxWindSpeed: number
    avgWaveHeight: number
    avgWindSpeed: number
    routeRiskPoints: number
    cautionNodesCount: number
    blockedNodesEncountered: number
    hazards: string[]
    restrictedZonesAvoided: string[]
    forecastNote: string
    executionTimeMs: number
    timeline: Array<{
        waypointIndex: number
        lat: number
        lon: number
        estimatedArrival: string
        cumulativeDistanceKm: number
        waveHeight: number
        windSpeed: number
        status: 'GO' | 'CAUTION' | 'NO-GO'
    }>
}

export interface SafeRouteRequest {
    originLat: number
    originLon: number
    destLat: number
    destLon: number
    boatKey?: string
    departureTime?: string
    cycloneActive?: boolean
}

/**
 * Fetches a safe marine route from origin to destination
 * Uses the Route Agent to calculate a weather-aware path avoiding hazards
 */
export async function fetchSafeRoute(
    params: SafeRouteRequest
): Promise<SafeRouteResult | null> {
    const offlineMode = useAppStore.getState().offlineMode;
    if (offlineMode || !navigator.onLine) {
        console.warn('Cannot fetch safe route while offline');
        return null;
    }

    try {
        const queryParams = new URLSearchParams({
            originLat: params.originLat.toString(),
            originLon: params.originLon.toString(),
            destLat: params.destLat.toString(),
            destLon: params.destLon.toString(),
            boatKey: params.boatKey || 'mechanized',
            cycloneActive: (params.cycloneActive || false).toString(),
        })

        if (params.departureTime) {
            queryParams.append('departureTime', params.departureTime)
        }

        const res = await fetch(`/api/trip/safe-route?${queryParams}`)

        if (!res.ok) {
            console.error(`Route API error: ${res.status} ${res.statusText}`)
            return null
        }

        const data = await res.json()
        return data.data || null
    } catch (error) {
        console.error('Failed to fetch safe route:', error)
        return null
    }
}

/**
 * Converts route waypoints array into GeoJSON LineString for map display
 */
export function routeToGeoJSON(waypoints: [number, number][]) {
    return {
        type: 'LineString' as const,
        coordinates: waypoints.map(([lat, lon]) => [lon, lat]), // GeoJSON uses [lon, lat]
    }
}

/**
 * Generates status color for route visualization
 */
export function getRouteStatusColor(
    status: 'GO' | 'CAUTION' | 'NO-GO'
): { color: string; opacity: number; width: number } {
    switch (status) {
        case 'GO':
            return { color: '#10B981', opacity: 0.8, width: 3 }
        case 'CAUTION':
            return { color: '#F59E0B', opacity: 0.7, width: 2.5 }
        case 'NO-GO':
            return { color: '#EF4444', opacity: 0.6, width: 2 }
    }
}

export interface TripAnalysisRequest {
    originLat: number
    originLon: number
    originName: string
    destLat: number
    destLon: number
    destName: string
    departureDate?: string
    departureTime?: string
    boatKey: 'small' | 'mechanized'
    purpose?: string
}

export interface TripAnalysisResult {
    tripSummary: {
        originName: string
        origin: { lat: number; lon: number }
        destName: string
        destination: { lat: number; lon: number }
        departureDate: string
        departureTime: string
        boatKey: 'small' | 'mechanized'
        boatLabel: string
        purpose: string
    }
    route: SafeRouteResult | null
    weather: any | null
    ocean: any | null
    geospatial: {
        distanceToBoundaryNm: number
        nearestFishingZoneKm: number
        routeAnalysis: any | null
        dataSource: string
        isMockData: boolean
    }
    risk: {
        overallStatus: 'GO' | 'CAUTION' | 'NO_GO'
        reasons: string[]
    }
}

/**
 * Executes full multi-agent trip analysis
 */
export async function analyzeTrip(
    params: TripAnalysisRequest
): Promise<TripAnalysisResult | null> {
    try {
        const res = await fetch('/api/trip/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(params),
        })

        if (!res.ok) {
            console.error(`Trip Analyze API error: ${res.status} ${res.statusText}`)
            return null
        }

        const data = await res.json()
        return data.data || null
    } catch (error) {
        console.error('Failed to analyze trip:', error)
        return null
    }
}

