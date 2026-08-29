/**
 * ORCA Mock Data Provider
 * ─────────────────────────────────────────────────────────────────────
 * All functions in this file return clearly-labeled MOCK/DEMO data.
 * isMockData: true is ALWAYS set — never pretend this is live data.
 * Replace by swapping the service layer when real APIs are available.
 */

import type {
  WeatherSnapshot, OrcaRecommendation, Alert, FishingZone,
  TripPlan, CommunityPost, AgentTraceStep
} from '../../types'

// ─── Mock Weather ─────────────────────────────────────────────────────
export const mockWeather: WeatherSnapshot = {
  temperature: 28,
  feelsLike: 31,
  condition: 'Partly Cloudy',
  windSpeed: 18,
  windDirection: 'SW',
  humidity: 74,
  visibility: 12,
  waveHeight: 1.2,
  swellPeriod: 8,
  seaState: 'Slight',
  rainProbability: 20,
  lightningRisk: false,
  isMockData: true,
  location: 'Chennai Coast',
  timestamp: new Date(),
}

// ─── Mock CAUTION Recommendation ─────────────────────────────────────
export const mockCautionRecommendation: OrcaRecommendation = {
  level: 'CAUTION',
  summary:
    'You can go fishing early morning, but conditions are expected to deteriorate after 10:30 AM. Return before 11:30 AM.',
  reasoning: [
    'Wind speed increases from 18 to 26 km/h after 10:30 AM',
    'Wave height rises from 1.2 m to 1.8 m after 12:00 PM',
    'Fishing suitability is currently HIGH in PFZ-B',
    'No active cyclone warning in the region',
    'Safe route available — no boundary conflict',
  ],
  evidence: [
    { label: 'Wind Speed',      value: '18–22 km/h',   meta: 'Increases after 10:30 AM', icon: '💨' },
    { label: 'Wave Height',     value: '1.2 m → 1.8 m', meta: 'After 12:00 PM',           icon: '🌊' },
    { label: 'Fishing Suitability', value: 'HIGH',      meta: 'PFZ-B (current)',           icon: '🎣' },
    { label: 'Boundary',        value: 'Clear',         meta: 'No conflict',               icon: '🚩' },
    { label: 'Cyclone Warning', value: 'None Active',   meta: 'Region clear',              icon: '🌀' },
    { label: 'Sea State',       value: 'Slight–Moderate', meta: 'Deteriorates post 11 AM', icon: '⛵' },
  ],
  returnWindow: {
    departureTime: '06:30 AM',
    returnByTime: '11:15 AM',
    reason: 'Conditions deteriorate after 12:00 PM. 45-min return journey must begin by 11:15 AM.',
    travelTimeMinutes: 45,
  },
  dataFreshness: {
    weather:   'Updated 2 hours ago',
    marine:    'Valid 05:00–17:00 IST',
    satellite: 'Issued today at 06:00 IST',
    updatedAt: new Date(),
  },
  confidence: 'MEDIUM',
  isMockData: true,
}

// ─── Mock GO Recommendation ───────────────────────────────────────────
export const mockGoRecommendation: OrcaRecommendation = {
  level: 'GO',
  summary: 'Conditions are favourable for fishing today. All safety checks passed.',
  reasoning: [
    'Wind speed is 14 km/h — well within safe limits',
    'Wave height is 0.8 m — calm sea state',
    'PFZ-A shows high chlorophyll concentration',
    'No active alerts in the area',
    'Route is clear of boundary conflicts',
  ],
  evidence: [
    { label: 'Wind Speed',   value: '14 km/h',   meta: 'Safe threshold < 30 km/h', icon: '💨' },
    { label: 'Wave Height',  value: '0.8 m',     meta: 'Calm — Safe < 1.5 m',      icon: '🌊' },
    { label: 'Fishing Zone', value: 'PFZ-A HIGH', meta: 'SST 28.5°C optimal',       icon: '🎣' },
    { label: 'Alerts',       value: 'None',       meta: 'All clear',                icon: '✅' },
  ],
  returnWindow: {
    departureTime: '05:30 AM',
    returnByTime: '03:00 PM',
    reason: 'Full-day window is safe. Return before sunset recommended.',
    travelTimeMinutes: 30,
  },
  dataFreshness: {
    weather:   'Updated 30 minutes ago',
    marine:    'Valid 05:00–21:00 IST',
    satellite: 'Issued today at 06:00 IST',
    updatedAt: new Date(),
  },
  confidence: 'HIGH',
  isMockData: true,
}

// ─── Mock NO-GO Recommendation ────────────────────────────────────────
export const mockNoGoRecommendation: OrcaRecommendation = {
  level: 'NO_GO',
  summary: 'Dangerous conditions. Do not attempt fishing today. Return to safe harbour.',
  reasoning: [
    'Cyclone Advisory issued — storm system approaching',
    'Wind speed forecast 45 km/h+ — exceeds safe limit',
    'Wave height forecast 3.2 m — HIGH RISK',
    'All fishing zones suspended by marine advisory',
  ],
  evidence: [
    { label: 'Cyclone',     value: 'Advisory Active', meta: 'IMD issued 04:00 IST', icon: '🌀', status: 'NO_GO' },
    { label: 'Wind Speed',  value: '45+ km/h',        meta: 'DANGER > 30 km/h',     icon: '💨', status: 'NO_GO' },
    { label: 'Wave Height', value: '3.2 m',           meta: 'DANGER > 2.5 m',       icon: '🌊', status: 'NO_GO' },
    { label: 'Advisory',    value: 'Suspended',       meta: 'All zones suspended',   icon: '⚠️', status: 'NO_GO' },
  ],
  dataFreshness: {
    weather:   'Updated 15 minutes ago',
    marine:    'Emergency advisory active',
    satellite: 'Issued today at 04:00 IST',
    updatedAt: new Date(),
  },
  confidence: 'HIGH',
  isMockData: true,
}

// ─── Agent Trace Steps ────────────────────────────────────────────────
export const mockAgentSteps: AgentTraceStep[] = [
  { agentId: 'planner',     agentName: 'Planner Agent',          status: 'pending' },
  { agentId: 'weather',     agentName: 'Weather Intelligence',   status: 'pending' },
  { agentId: 'ocean',       agentName: 'Ocean Analytics',        status: 'pending' },
  { agentId: 'satellite',   agentName: 'Satellite / EO Agent',   status: 'pending' },
  { agentId: 'geospatial',  agentName: 'Geospatial Reasoning',   status: 'pending' },
  { agentId: 'risk',        agentName: 'Risk Assessment Engine', status: 'pending' },
  { agentId: 'synthesis',   agentName: 'Synthesis Agent',        status: 'pending' },
]

// ─── Mock Alerts ──────────────────────────────────────────────────────
export const mockAlerts: Alert[] = [
  {
    id: 'a1',
    type: 'HIGH_WAVES',
    title: 'High Wave Advisory',
    description: 'Wave heights of 1.8–2.2 m expected along Chennai–Pondicherry coast after 12:00 PM.',
    severity: 'MEDIUM',
    issuedAt: new Date(Date.now() - 2 * 3600000),
    validUntil: new Date(Date.now() + 8 * 3600000),
    source: '[DEMO] IMD Marine Advisory',
    isMockData: true,
  },
  {
    id: 'a2',
    type: 'STRONG_WINDS',
    title: 'Strong Wind Warning',
    description: 'Wind speeds of 22–28 km/h expected from SW direction afternoon onwards.',
    severity: 'LOW',
    issuedAt: new Date(Date.now() - 1 * 3600000),
    source: '[DEMO] IMD Wind Advisory',
    isMockData: true,
  },
]

// ─── Mock Fishing Zones ───────────────────────────────────────────────
export const mockFishingZones: FishingZone[] = [
  {
    id: 'pfz-a',
    name: 'PFZ Alpha — North Chennai',
    center: { lat: 13.25, lon: 80.42 },
    polygon: [],
    suitability: 'HIGH',
    sst: 28.5,
    chlorophyll: 1.8,
    distanceKm: 42,
    recommendation: 'NO_GO',
    reasons: [
      'High fishing suitability',
      'BUT: Wave height exceeds safe limit after 11:00 AM',
      'Return journey conflicts with deteriorating weather',
    ],
    isMockData: true,
  },
  {
    id: 'pfz-b',
    name: 'PFZ Beta — South Coastal',
    center: { lat: 12.85, lon: 80.35 },
    polygon: [],
    suitability: 'MODERATE',
    sst: 27.8,
    chlorophyll: 1.4,
    distanceKm: 28,
    recommendation: 'CAUTION',
    reasons: [
      'Moderate fishing suitability',
      'Lower wave exposure',
      'Safe return window before conditions deteriorate',
      'No boundary conflict on route',
    ],
    isMockData: true,
  },
  {
    id: 'pfz-c',
    name: 'PFZ Gamma — Nearshore Zone',
    center: { lat: 13.08, lon: 80.28 },
    polygon: [],
    suitability: 'MODERATE',
    sst: 29.1,
    chlorophyll: 1.1,
    distanceKm: 12,
    recommendation: 'GO',
    reasons: [
      'Short distance — quick return capability',
      'Moderate suitability but safe conditions all day',
      'Nearshore — lowest risk zone today',
    ],
    isMockData: true,
  },
]

// ─── Mock 3-Day Trip Plan ─────────────────────────────────────────────
export const mockTripPlan: TripPlan = {
  id: 'trip-demo-1',
  startLocation: { lat: 13.083, lon: 80.270 },
  startLocationName: 'Chennai Fishing Harbour',
  departureDateStr: 'Tomorrow',
  days: 3,
  overallStatus: 'CAUTION',
  isMockData: true,
  generatedAt: new Date(),
  dayPlans: [
    {
      date: new Date(Date.now() + 86400000),
      dayNumber: 1,
      status: 'GO',
      morning:   { label: 'Morning', status: 'GO',      notes: 'Calm conditions. Depart 06:30 AM.' },
      afternoon: { label: 'Afternoon', status: 'GO',    notes: 'Stable. Fishing window until 2 PM.' },
      evening:   { label: 'Evening', status: 'GO',      notes: 'Return by 5 PM recommended.' },
      recommendedDepartureTime: '06:30 AM',
      recommendedReturnTime: '03:00 PM',
      weatherSummary: 'Wind 14 km/h, Waves 0.9 m, Clear skies',
      warnings: [],
    },
    {
      date: new Date(Date.now() + 2 * 86400000),
      dayNumber: 2,
      status: 'CAUTION',
      morning:   { label: 'Morning', status: 'GO',      notes: 'Good early window. Depart by 06:00.' },
      afternoon: { label: 'Afternoon', status: 'CAUTION', notes: 'Wind picks up. Return by 11:30 AM.' },
      evening:   { label: 'Evening', status: 'NO_GO',  notes: 'Avoid — conditions deteriorate.' },
      recommendedDepartureTime: '06:00 AM',
      recommendedReturnTime: '11:30 AM',
      weatherSummary: 'Wind 22 km/h by noon, Waves 1.8 m PM',
      warnings: ['Return before 11:30 AM — conditions worsen rapidly'],
    },
    {
      date: new Date(Date.now() + 3 * 86400000),
      dayNumber: 3,
      status: 'NO_GO',
      morning:   { label: 'Morning', status: 'NO_GO', notes: 'High winds from early morning.' },
      afternoon: { label: 'Afternoon', status: 'NO_GO', notes: 'Storm conditions forecast.' },
      evening:   { label: 'Evening', status: 'NO_GO', notes: 'Do not attempt.' },
      weatherSummary: 'Wind 38 km/h, Waves 2.9 m, Heavy rain',
      warnings: ['DO NOT GO — all conditions unsafe', 'Marine advisory in effect'],
    },
  ],
}

// ─── Mock Community Posts ─────────────────────────────────────────────
export const mockCommunityPosts: CommunityPost[] = [
  {
    id: 'cp1',
    userId: 'u1',
    userName: 'Ramesh K.',
    postType: 'CONDITION_REPORT',
    title: 'Sea conditions near Thiruvanmiyur',
    content: 'Morning sea was calm. Saw good fish near the 15 km mark. Wind picked up around 10 AM. Suggest early return.',
    locationName: 'Thiruvanmiyur Coast',
    reactions: { like: 12, helpful: 8, verify: 5 },
    commentsCount: 3,
    createdAt: new Date(Date.now() - 3 * 3600000),
    isOfficial: false,
    isVerified: false,
  },
  {
    id: 'cp2',
    userId: 'u2',
    userName: 'Murugan S.',
    postType: 'DANGER_REPORT',
    title: 'Strong currents near Zone B today',
    content: 'WARNING: Strong undercurrents between 13.1°N and 13.2°N. My boat was affected. Please avoid.',
    locationName: 'Zone B — Offshore',
    reactions: { like: 28, helpful: 24, verify: 15 },
    commentsCount: 11,
    createdAt: new Date(Date.now() - 1 * 3600000),
    isOfficial: false,
    isVerified: true,
  },
]

// ─── Question → Response mapper (demo) ────────────────────────────────
export function getMockResponseForQuery(query: string): {
  recommendation: OrcaRecommendation
  answer: string
} {
  const q = query.toLowerCase()
  if (q.includes('safe') || q.includes('go') || q.includes('tomorrow') || q.includes('fish')) {
    return {
      recommendation: mockCautionRecommendation,
      answer: `Based on current conditions near Chennai coast, I recommend **CAUTION**. Early morning is safe, but conditions deteriorate after 10:30 AM. Depart by 06:30 AM and return no later than 11:15 AM.`,
    }
  }
  if (q.includes('dangerous') || q.includes('cyclone') || q.includes('storm') || q.includes('avoid')) {
    return {
      recommendation: mockNoGoRecommendation,
      answer: `Dangerous conditions detected. A cyclone advisory is active and wave heights are forecast at 3.2 m. I strongly advise against any fishing trips today.`,
    }
  }
  return {
    recommendation: mockGoRecommendation,
    answer: `Conditions look favourable today! Wind is at 14 km/h, waves are calm at 0.8 m, and PFZ-A shows high fish concentration. You can safely plan a full-day trip.`,
  }
}
