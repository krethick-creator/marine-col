export type StatusLevel = 'GO' | 'CAUTION' | 'NO_GO';
export interface LatLon {
    lat: number;
    lon: number;
}
export type MessageRole = 'user' | 'assistant' | 'system';
export interface ChatMessage {
    id: string;
    role: MessageRole;
    content: string;
    timestamp: Date;
    agentTrace?: AgentTraceStep[];
    recommendation?: OrcaRecommendation;
    isMockData?: boolean;
}
export interface AgentTraceStep {
    agentId: string;
    agentName: string;
    status: 'pending' | 'running' | 'done' | 'error';
    startedAt?: Date;
    completedAt?: Date;
    output?: string;
}
export interface OrcaRecommendation {
    level: StatusLevel;
    summary: string;
    reasoning: string[];
    evidence: EvidenceItem[];
    returnWindow?: ReturnWindow;
    dataFreshness: DataFreshnessInfo;
    confidence: 'HIGH' | 'MEDIUM' | 'LOW';
    isMockData: boolean;
}
export interface EvidenceItem {
    label: string;
    value: string;
    meta?: string;
    icon?: string;
    status?: StatusLevel;
}
export interface ReturnWindow {
    departureTime: string;
    returnByTime: string;
    reason: string;
    travelTimeMinutes: number;
}
export interface DataFreshnessInfo {
    weather: string;
    marine: string;
    satellite: string;
    updatedAt: Date;
}
export interface WeatherSnapshot {
    temperature: number;
    feelsLike: number;
    condition: string;
    windSpeed: number;
    windDirection: string;
    humidity: number;
    visibility: number;
    waveHeight: number;
    swellPeriod: number;
    seaState: string;
    rainProbability: number;
    lightningRisk: boolean;
    isMockData: boolean;
    location: string;
    timestamp: Date;
}
export interface WeatherForecast {
    hourly: HourlyWeather[];
    daily: DailyWeather[];
    isMockData: boolean;
}
export interface HourlyWeather {
    time: Date;
    temperature: number;
    windSpeed: number;
    waveHeight: number;
    precipitation: number;
    condition: string;
}
export interface DailyWeather {
    date: Date;
    high: number;
    low: number;
    windSpeedMax: number;
    waveHeightMax: number;
    condition: string;
    status: StatusLevel;
    safeWindow?: {
        start: string;
        end: string;
    };
}
export interface FishingZone {
    id: string;
    name: string;
    center: LatLon;
    polygon: LatLon[];
    suitability: 'HIGH' | 'MODERATE' | 'LOW';
    sst: number;
    chlorophyll: number;
    distanceKm: number;
    recommendation: StatusLevel;
    reasons: string[];
    isMockData: boolean;
}
export interface OceanSnapshot {
    sst: number | null;
    chlorophyll: number | null;
    waveHeight: number | null;
    waveDirection?: number | null;
    wavePeriod?: number | null;
    swellHeight?: number | null;
    swellPeriod: number | null;
    swellDirection: string | null;
    currentSpeed: number | null;
    currentDirection: string | null;
    seaState?: string | null;
    units?: Record<string, string>;
    isMockData: boolean;
    timestamp: Date;
}
export type AlertType = 'CYCLONE' | 'LIGHTNING' | 'HIGH_WAVES' | 'STRONG_WINDS' | 'DANGEROUS_SEA' | 'RESTRICTED_AREA' | 'BOUNDARY_PROXIMITY' | 'MARINE_ADVISORY';
export interface Alert {
    id: string;
    type: AlertType;
    title: string;
    description: string;
    severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
    issuedAt: Date;
    validUntil?: Date;
    affectedArea?: LatLon[];
    source: string;
    isMockData: boolean;
}
export interface TripPlan {
    id: string;
    startLocation: LatLon;
    startLocationName: string;
    targetZoneId?: string;
    departureDateStr: string;
    days: number;
    dayPlans: DayPlan[];
    overallStatus: StatusLevel;
    isMockData: boolean;
    generatedAt: Date;
}
export interface DayPlan {
    date: Date;
    dayNumber: number;
    status: StatusLevel;
    morning: TimeSlot;
    afternoon: TimeSlot;
    evening: TimeSlot;
    recommendedDepartureTime?: string;
    recommendedReturnTime?: string;
    weatherSummary: string;
    warnings: string[];
}
export interface TimeSlot {
    label: string;
    status: StatusLevel;
    notes: string;
}
export type PostType = 'OBSERVATION' | 'CONDITION_REPORT' | 'ZONE_REPORT' | 'DANGER_REPORT';
export interface CommunityPost {
    id: string;
    userId: string;
    userName: string;
    postType: PostType;
    title: string;
    content: string;
    location?: LatLon;
    locationName?: string;
    images?: string[];
    reactions: {
        like: number;
        helpful: number;
        verify: number;
    };
    commentsCount: number;
    createdAt: Date;
    isOfficial: false;
    isVerified: boolean;
}
export interface UserProfile {
    id: string;
    name: string;
    role: 'FISHERMAN' | 'OFFICIAL' | 'RESEARCHER' | 'ADMIN';
    location?: LatLon;
    locationName?: string;
    language: string;
    offlineMode: boolean;
}
