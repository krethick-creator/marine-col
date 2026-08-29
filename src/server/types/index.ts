// ─── Shared Backend Types ──────────────────────────────────────────────
// Mirrors the frontend types but lives in the backend. Single source of
// truth for API shapes. Frontend service layer must match these.

export type StatusLevel = 'GO' | 'CAUTION' | 'NO_GO'
export type AlertSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
export type AlertType =
  | 'CYCLONE' | 'LIGHTNING' | 'HIGH_WAVES' | 'STRONG_WINDS'
  | 'DANGEROUS_SEA' | 'RESTRICTED_AREA' | 'BOUNDARY_PROXIMITY'
  | 'MARINE_ADVISORY'

export interface LatLon { lat: number; lon: number }

// ─── Weather types ─────────────────────────────────────────────────────
export interface CurrentWeather {
  temperature: number
  feelsLike: number
  condition: string
  windSpeed: number        // km/h
  windDirection: string
  humidity: number
  visibility: number
  waveHeight: number | null       // metres
  swellPeriod: number | null      // seconds
  seaState: string | null
  rainProbability: number  // 0–100
  lightningRisk: boolean
  location: string
  isMockData: boolean
  timestamp: Date
}

export interface HourlyWeather {
  time: Date
  temperature: number
  windSpeed: number
  waveHeight: number | null
  precipitation: number
  condition: string
}

export interface DailyWeather {
  date: Date
  high: number
  low: number
  windSpeedMax: number
  waveHeightMax: number | null
  condition: string
  status: StatusLevel
  safeWindow?: { start: string; end: string }
}

export interface WeatherForecast {
  current: CurrentWeather
  hourly: HourlyWeather[]
  daily: DailyWeather[]
  isMockData: boolean
  dataSource: string
  fetchedAt: Date
}

// ─── Ocean types ───────────────────────────────────────────────────────
export interface OceanSnapshot {
  sst: number               // Sea Surface Temperature °C
  chlorophyll: number       // mg/m³
  waveHeight: number        // metres
  swellDirection: string
  currentSpeed: number      // knots
  currentDirection: string
  isMockData: boolean
  dataSource: string
  timestamp: Date
}

// ─── PFZ / Fishing Zone ────────────────────────────────────────────────
export interface FishingZone {
  id: string
  name: string
  center: LatLon
  polygon: LatLon[]
  suitability: 'HIGH' | 'MODERATE' | 'LOW'
  sst: number
  chlorophyll: number
  distanceKm: number
  recommendation: StatusLevel
  reasons: string[]
  isMockData: boolean
  dataSource: string
  issuedAt: Date
}

// ─── Satellite ─────────────────────────────────────────────────────────
export interface SatelliteSnapshot {
  pfzZones: FishingZone[]
  chlorophyllGrid: unknown | null   // GeoJSON for Phase 7 map
  sstGrid: unknown | null
  isMockData: boolean
  dataSource: string
  issuedAt: Date
}

// ─── Geospatial ────────────────────────────────────────────────────────
export interface GeospatialSnapshot {
  routeIntersectsRestricted: boolean
  routeNearBoundary: boolean
  distanceToBoundaryNm: number
  restrictedZonesOnRoute: string[]
  alternativeRouteAvailable: boolean
  isMockData: boolean
}

// ─── Alerts ────────────────────────────────────────────────────────────
export interface Alert {
  id: string
  type: AlertType
  title: string
  description: string
  severity: AlertSeverity
  issuedAt: Date
  validUntil?: Date
  affectedArea?: LatLon[]
  source: string
  isMockData: boolean
}

// ─── Advisory ──────────────────────────────────────────────────────────
export interface Advisory {
  id: string
  title: string
  body: string
  validFrom: Date
  validUntil: Date
  source: string
  isMockData: boolean
}

// ─── Risk ──────────────────────────────────────────────────────────────
// These types are the inputs and outputs of the deterministic RiskEngine.
// The LLM in the Synthesis Agent receives RiskAssessment as READ-ONLY.

export interface RiskInputs {
  weather: {
    windSpeed: number
    waveHeight: number | null
    seaState: string | null
    rainProbability: number
    lightningRisk: boolean
    hourly: HourlyWeather[]
  }
  ocean: OceanSnapshot
  geospatial: GeospatialSnapshot
  alerts: Alert[]
  location: LatLon
  departureTime?: Date
  tripDurationHours?: number
  travelTimeMinutes?: number
  isMockData: boolean
}

export interface RiskViolation {
  rule: string
  level: StatusLevel
  value?: number | string
  description: string
}

export interface ReturnWindow {
  departureTime: string    // "06:30 AM"
  returnByTime: string     // "11:15 AM"
  reason: string
  travelTimeMinutes: number
  safeWindowEnds: string
}

export interface DataFreshnessInfo {
  weather: string
  marine: string
  satellite: string
  updatedAt: Date
  confidence: 'HIGH' | 'MEDIUM' | 'LOW'
}

export interface RiskAssessment {
  level: StatusLevel           // The final verdict — LLM CANNOT change this
  violations: RiskViolation[]
  confidence: 'HIGH' | 'MEDIUM' | 'LOW'
  returnWindow: ReturnWindow | null
  explainableReasons: string[] // Human-readable reasons for the verdict
  dataFreshness: DataFreshnessInfo
  isMockData: boolean
  evaluatedAt: Date
}

// ─── ORCA Response ─────────────────────────────────────────────────────
// The final structured object returned to the frontend

export interface EvidenceItem {
  label: string
  value: string
  meta?: string
  icon?: string
  status?: StatusLevel
}

export interface OrcaResponse {
  message: string            // Natural language answer from Synthesis Agent
  recommendation: {
    level: StatusLevel
    summary: string
    reasoning: string[]
    evidence: EvidenceItem[]
    returnWindow: ReturnWindow | null
    dataFreshness: DataFreshnessInfo
    confidence: 'HIGH' | 'MEDIUM' | 'LOW'
    isMockData: boolean
  }
  agentTrace: AgentTraceStep[]
  isMockData: boolean
  sessionId: string
  timestamp: Date
}

export interface AgentTraceStep {
  agentId: string
  agentName: string
  status: 'pending' | 'running' | 'done' | 'error'
  startedAt?: Date
  completedAt?: Date
  durationMs?: number
  output?: string
  error?: string
}

// ─── Trip Plan ─────────────────────────────────────────────────────────
export interface TripPlanRequest {
  startLocation: LatLon
  startLocationName: string
  targetZoneId?: string
  departureDateStr: string
  days: number
  travelTimeMinutes?: number
}

export interface TimeSlot {
  label: string
  status: StatusLevel
  notes: string
}

export interface DayPlan {
  date: Date
  dayNumber: number
  status: StatusLevel
  morning: TimeSlot
  afternoon: TimeSlot
  evening: TimeSlot
  recommendedDepartureTime?: string
  recommendedReturnTime?: string
  weatherSummary: string
  warnings: string[]
}

export interface TripPlan {
  id: string
  startLocation: LatLon
  startLocationName: string
  departureDateStr: string
  days: number
  dayPlans: DayPlan[]
  overallStatus: StatusLevel
  isMockData: boolean
  generatedAt: Date
}

// ─── Community ─────────────────────────────────────────────────────────
export type PostType = 'OBSERVATION' | 'CONDITION_REPORT' | 'ZONE_REPORT' | 'DANGER_REPORT'

export interface CommunityPost {
  id: string
  userId: string
  userName: string
  postType: PostType
  title: string
  content: string
  location?: LatLon
  locationName?: string
  images?: string[]
  reactions: { like: number; helpful: number; verify: number }
  commentsCount: number
  createdAt: Date
  isOfficial: false    // Community posts are NEVER official
  isVerified: boolean
}

// ─── SOS ───────────────────────────────────────────────────────────────
export interface SOSRequest {
  userId?: string
  location: LatLon
  locationAccuracyMetres?: number
  tripId?: string
  message?: string
  emergencyContactPhone?: string
}

export interface SOSEvent {
  id: string
  userId?: string
  location: LatLon
  tripId?: string
  message?: string
  status: 'RECEIVED' | 'DISPATCHED' | 'RESOLVED'
  createdAt: Date
  isMockData: boolean  // true if backend is in demo mode
}

// ─── Auth ──────────────────────────────────────────────────────────────
export interface JWTPayload {
  userId: string
  role: string
  iat?: number
  exp?: number
}

// ─── API Envelope ──────────────────────────────────────────────────────
// Every REST response is wrapped in this envelope.

export interface ApiSuccess<T> {
  ok: true
  data: T
  isMockData?: boolean
  timestamp: string
}

export interface ApiError {
  ok: false
  error: string
  code?: string
  details?: unknown
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError
