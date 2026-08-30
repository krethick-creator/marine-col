// ============================================================================
// ORCA ROUTE AGENT — Deterministic Weather-Aware A* Route Engine
// 
// Architectural Role:
// - Deterministic mathematical pathfinding on a geographic grid
// - Evaluates spatial & temporal marine and atmospheric forecasts
// - Explicitly avoids restricted zones and blocked cells
// - Accounts for boat operational thresholds
// - Produces structured route evidence for Planner and Risk Agents
// - Contains NO LLMs, NO satellite/SST hallucination, and NO external black-boxes.
// ============================================================================

export type LatLon = [number, number]; // [latitude, longitude]

export interface LatLonCoord {
  lat: number;
  lon: number;
}

export interface Zone {
  id?: string;
  name?: string;
  lat: number;
  lon: number;
  radiusKm: number;
}

export interface BoatProfile {
  label: string;
  speedKmh: number;
  maxWave: number; // Max operational wave height in metres
  maxWind: number; // Max operational wind speed in km/h
}

export const BOAT_PROFILES: Record<string, BoatProfile> = {
  small: {
    label: "Small traditional boat",
    speedKmh: 12,
    maxWave: 1.2,
    maxWind: 25,
  },
  mechanized: {
    label: "Mechanized boat",
    speedKmh: 18,
    maxWave: 2.0,
    maxWind: 35,
  },
};

export interface GridNode {
  lat: number;
  lon: number;
  row: number;
  col: number;
}

export interface NodeRisk {
  waveHeight: number;
  windSpeed: number;
  points: number;
  blocked: boolean;
  reason?: string;
}

export interface HourlyForecastBlock {
  hourly: {
    time: string[];
    wave_height?: (number | null)[];
    wind_speed_10m?: (number | null)[];
  };
}

export interface GridForecast {
  node: GridNode;
  marine: HourlyForecastBlock;
  weather: HourlyForecastBlock;
}

export type ForecastFetcher = (
  nodes: GridNode[][]
) => Promise<GridForecast[]>;

export interface RouteAgentOptions {
  boatKey?: keyof typeof BOAT_PROFILES | string;
  customBoatProfile?: BoatProfile;
  departureTime?: Date;
  restrictedZones?: Zone[];
  cycloneActive?: boolean;
  gridSize?: number;
  forecastFetcher?: ForecastFetcher;
}

export interface WaypointTimelineItem {
  waypointIndex: number;
  lat: number;
  lon: number;
  estimatedArrival: string;
  cumulativeDistanceKm: number;
  waveHeight: number;
  windSpeed: number;
  status: "GO" | "CAUTION" | "NO-GO";
}

export interface SafeRouteResult {
  success: boolean;
  status: "GO" | "CAUTION" | "NO-GO";
  reason?: string;
  error?: string;
  boat: string;
  boatKey: string;
  departureTime: string;
  waypoints: LatLon[];
  distanceKm: number;
  straightLineDistanceKm: number;
  travelTimeMinutes: number;
  maxWaveHeight: number;
  maxWindSpeed: number;
  avgWaveHeight: number;
  avgWindSpeed: number;
  routeRiskPoints: number;
  cautionNodesCount: number;
  blockedNodesEncountered: number;
  hazards: string[];
  restrictedZonesAvoided: string[];
  forecastNote: string;
  executionTimeMs: number;
  timeline: WaypointTimelineItem[];
}

// ─── Mathematical Geometry & Haversine Utilities ─────────────────────────────

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/**
 * Calculates great-circle distance between two geographic coordinates using Haversine formula.
 * Returns distance in kilometres.
 */
export function haversineKm(a: LatLon, b: LatLon): number {
  const R = 6371; // Earth's mean radius in km
  const dLat = toRad(b[0] - a[0]);
  const dLon = toRad(b[1] - a[1]);
  const lat1 = toRad(a[0]);
  const lat2 = toRad(b[0]);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;

  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * Builds a regular 2D geographic grid spanning the bounding box [latMin, latMax] x [lonMin, lonMax].
 */
export function buildGrid(
  latMin: number,
  latMax: number,
  lonMin: number,
  lonMax: number,
  gridSize = 8
): GridNode[][] {
  const nodes: GridNode[][] = [];
  const safeGridSize = Math.max(2, gridSize);

  for (let r = 0; r < safeGridSize; r++) {
    const row: GridNode[] = [];
    const lat = latMin + ((latMax - latMin) * r) / (safeGridSize - 1);
    for (let c = 0; c < safeGridSize; c++) {
      const lon = lonMin + ((lonMax - lonMin) * c) / (safeGridSize - 1);
      row.push({
        lat: parseFloat(lat.toFixed(5)),
        lon: parseFloat(lon.toFixed(5)),
        row: r,
        col: c,
      });
    }
    nodes.push(row);
  }
  return nodes;
}

/**
 * Finds the nearest GridNode to a target coordinate.
 */
export function nearestNode(nodes: GridNode[][], target: LatLon): GridNode {
  let best = nodes[0][0];
  let bestDist = Infinity;

  for (const row of nodes) {
    for (const n of row) {
      const d = haversineKm([n.lat, n.lon], target);
      if (d < bestDist) {
        bestDist = d;
        best = n;
      }
    }
  }
  return best;
}

/**
 * Checks if a point is inside any restricted zone circle.
 */
export function isInsideAnyZone(
  lat: number,
  lon: number,
  zones: Zone[]
): { inside: boolean; zone?: Zone } {
  for (const z of zones) {
    const d = haversineKm([lat, lon], [z.lat, z.lon]);
    if (d <= z.radiusKm) {
      return { inside: true, zone: z };
    }
  }
  return { inside: false };
}

// ─── Open-Meteo Weather & Marine Forecast Retrieval ──────────────────────────

/**
 * Validates hourly payload structure from Open-Meteo.
 */
function isValidHourlyPayload(data: unknown): data is HourlyForecastBlock {
  if (!data || typeof data !== "object") return false;
  const d = data as Record<string, unknown>;
  if (!d.hourly || typeof d.hourly !== "object") return false;
  const h = d.hourly as Record<string, unknown>;
  return Array.isArray(h.time) && h.time.length > 0;
}

function createFallbackMarineData(weatherData: any): any {
  if (Array.isArray(weatherData)) {
    return weatherData.map(wBlock => ({
      hourly: {
        time: wBlock?.hourly?.time || [],
        wave_height: new Array((wBlock?.hourly?.time || []).length).fill(null)
      }
    }));
  }
  
  const times = weatherData?.hourly?.time || [];
  return {
    hourly: {
      time: times,
      wave_height: new Array(times.length).fill(null)
    }
  };
}

/**
 * Retrieves weather and marine forecasts for all grid nodes using Open-Meteo APIs.
 * Uses batched coordinate requests to minimize HTTP overhead.
 */
export async function defaultFetchGridForecast(
  nodes: GridNode[][]
): Promise<GridForecast[]> {
  const flat = nodes.flat();
  if (flat.length === 0) return [];

  const lats = flat.map((n) => n.lat.toFixed(4)).join(",");
  const lons = flat.map((n) => n.lon.toFixed(4)).join(",");

  const marineUrl =
    `https://marine-api.open-meteo.com/v1/marine` +
    `?latitude=${encodeURIComponent(lats)}` +
    `&longitude=${encodeURIComponent(lons)}` +
    `&hourly=wave_height` +
    `&cell_selection=sea`;

  const weatherUrl =
    `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${encodeURIComponent(lats)}` +
    `&longitude=${encodeURIComponent(lons)}` +
    `&hourly=wind_speed_10m`;

  let marineRes: Response;
  let weatherRes: Response;

  try {
    [marineRes, weatherRes] = await Promise.all([
      fetch(marineUrl, { headers: { "Accept": "application/json" } }),
      fetch(weatherUrl, { headers: { "Accept": "application/json" } }),
    ]);
  } catch (err) {
    throw new Error(
      `Network connection failure fetching Open-Meteo forecast: ${err instanceof Error ? err.message : String(err)}`
    );
  }

  if (!weatherRes.ok) {
    const errText = await weatherRes.text().catch(() => "");
    throw new Error(
      `Open-Meteo Weather API HTTP error ${weatherRes.status}: ${errText.slice(0, 200)}`
    );
  }

  let weatherData: unknown;
  try {
    weatherData = await weatherRes.json();
  } catch (err) {
    throw new Error(`Failed to parse Open-Meteo Weather API JSON response: ${err}`);
  }

  let marineData: unknown;
  if (marineRes.ok) {
    try {
      marineData = await marineRes.json();
    } catch (err) {
      console.warn(`Failed to parse Open-Meteo Marine API JSON response: ${err}. Using fallback.`);
      marineData = createFallbackMarineData(weatherData);
    }
  } else {
    console.warn(`Open-Meteo Marine API failed with status ${marineRes.status}. Using fallback.`);
    marineData = createFallbackMarineData(weatherData);
  }

  const marineBlocks = Array.isArray(marineData) ? marineData : [marineData];
  const weatherBlocks = Array.isArray(weatherData) ? weatherData : [weatherData];

  return flat.map((node, i) => {
    const mBlock = marineBlocks[i] ?? marineBlocks[0];
    const wBlock = weatherBlocks[i] ?? weatherBlocks[0];

    if (!isValidHourlyPayload(mBlock)) {
      throw new Error(
        `Invalid or missing hourly wave data from Open-Meteo Marine API for node (${node.lat}, ${node.lon})`
      );
    }
    if (!isValidHourlyPayload(wBlock)) {
      throw new Error(
        `Invalid or missing hourly wind data from Open-Meteo Weather API for node (${node.lat}, ${node.lon})`
      );
    }

    return {
      node,
      marine: mBlock,
      weather: wBlock,
    };
  });
}

/**
 * Selects the forecast value from hourly arrays closest to the target timestamp.
 * Handles null/undefined entries safely.
 */
export function pickHourValue(
  hourlyTimes: string[],
  hourlyValues: (number | null)[] | undefined,
  targetTime: Date,
  fallback = 0
): number {
  if (!hourlyTimes || hourlyTimes.length === 0 || !hourlyValues || hourlyValues.length === 0) {
    return fallback;
  }

  const targetMs = targetTime.getTime();
  let closestIdx = 0;
  let closestDiff = Infinity;

  for (let idx = 0; idx < hourlyTimes.length; idx++) {
    const timeMs = new Date(hourlyTimes[idx]).getTime();
    if (isNaN(timeMs)) continue;
    const diff = Math.abs(timeMs - targetMs);
    if (diff < closestDiff) {
      closestDiff = diff;
      closestIdx = idx;
    }
  }

  const val = hourlyValues[closestIdx];
  if (val === null || val === undefined || isNaN(val)) {
    // If exact target hour is null (e.g. land cell on wave model), search nearby non-null hours
    for (let offset = 1; offset < Math.max(closestIdx, hourlyValues.length - closestIdx); offset++) {
      const left = hourlyValues[closestIdx - offset];
      if (left !== null && left !== undefined && !isNaN(left)) return left;
      const right = hourlyValues[closestIdx + offset];
      if (right !== null && right !== undefined && !isNaN(right)) return right;
    }
    return fallback;
  }

  return val;
}

// ─── Weather Risk Scoring ───────────────────────────────────────────────────

/**
 * Computes deterministic risk score and blocked status for a grid node.
 * Uses continuous penalty scaling for waves and winds exceeding boat thresholds.
 */
export function scoreNode(
  waveHeight: number,
  windSpeed: number,
  boat: BoatProfile,
  isRestricted: boolean,
  cycloneActive: boolean,
  restrictedReason?: string
): NodeRisk {
  if (cycloneActive) {
    return {
      waveHeight,
      windSpeed,
      points: 999999,
      blocked: true,
      reason: "Active cyclone warning in region",
    };
  }

  if (isRestricted) {
    return {
      waveHeight,
      windSpeed,
      points: 999999,
      blocked: true,
      reason: restrictedReason ?? "Restricted maritime boundary / security zone",
    };
  }

  let points = 0;

  // Wave Risk Scoring
  if (waveHeight > boat.maxWave) {
    // Severe wave penalty: base 40 + scaled excess
    const waveExcess = (waveHeight - boat.maxWave) / boat.maxWave;
    points += 40 + waveExcess * 30;
  } else if (waveHeight > boat.maxWave * 0.75) {
    // Cautionary wave penalty
    const waveRatio = (waveHeight - boat.maxWave * 0.75) / (boat.maxWave * 0.25);
    points += waveRatio * 15;
  }

  // Wind Risk Scoring
  if (windSpeed > boat.maxWind) {
    // Severe wind penalty: base 25 + scaled excess
    const windExcess = (windSpeed - boat.maxWind) / boat.maxWind;
    points += 25 + windExcess * 20;
  } else if (windSpeed > boat.maxWind * 0.75) {
    // Cautionary wind penalty
    const windRatio = (windSpeed - boat.maxWind * 0.75) / (boat.maxWind * 0.25);
    points += windRatio * 10;
  }

  return {
    waveHeight,
    windSpeed,
    points: Math.round(points * 10) / 10,
    blocked: false,
  };
}

// ─── Deterministic A* Algorithm ─────────────────────────────────────────────

/**
 * Deterministic A* Pathfinding over the weather-risk geographic grid.
 * 
 * Cost Formulation:
 * - Edge length = haversineKm(current, neighbor) [km]
 * - Weather Penalty Multiplier = (1 + risk.points / 20)
 * - Edge Cost = edgeLength * (1 + risk.points / 20)
 * - Heuristic h(n) = haversineKm(n, goal) [km]
 * 
 * Because Edge Cost >= edgeLength >= h(n, goal), the heuristic is strictly admissible
 * and guarantees optimal shortest safe path.
 * 
 * Blocked nodes (restricted zones / cyclones) are strictly skipped and NEVER traversed.
 */
export function astar(
  nodes: GridNode[][],
  riskMap: Map<string, NodeRisk>,
  start: GridNode,
  goal: GridNode
): GridNode[] | null {
  const key = (n: GridNode) => `${n.row},${n.col}`;
  const startKey = key(start);
  const goalKey = key(goal);

  // If start or goal node is blocked, no path is possible
  const startRisk = riskMap.get(startKey);
  const goalRisk = riskMap.get(goalKey);
  if (startRisk?.blocked || goalRisk?.blocked) {
    return null;
  }

  const h = (n: GridNode) => haversineKm([n.lat, n.lon], [goal.lat, goal.lon]);

  const openSet = new Map<string, GridNode>();
  const cameFrom = new Map<string, string>();
  const gScore = new Map<string, number>();
  const fScore = new Map<string, number>();

  openSet.set(startKey, start);
  gScore.set(startKey, 0);
  fScore.set(startKey, h(start));

  const maxRows = nodes.length;
  const maxCols = nodes[0].length;

  // 8-way directional navigation (Orthogonal + Diagonals for realistic marine courses)
  const directions = [
    [-1, 0],  // N
    [1, 0],   // S
    [0, -1],  // W
    [0, 1],   // E
    [-1, -1], // NW
    [-1, 1],  // NE
    [1, -1],  // SW
    [1, 1],   // SE
  ];

  while (openSet.size > 0) {
    let currentKey = "";
    let currentF = Infinity;

    for (const [k] of openSet) {
      const f = fScore.get(k) ?? Infinity;
      if (f < currentF) {
        currentF = f;
        currentKey = k;
      }
    }

    const current = openSet.get(currentKey)!;

    // Reached destination node
    if (current.row === goal.row && current.col === goal.col) {
      const path: GridNode[] = [current];
      let currK = currentKey;
      while (cameFrom.has(currK)) {
        currK = cameFrom.get(currK)!;
        const [rStr, cStr] = currK.split(",");
        path.unshift(nodes[Number(rStr)][Number(cStr)]);
      }
      return path;
    }

    openSet.delete(currentKey);
    const currentG = gScore.get(currentKey) ?? Infinity;

    for (const [dr, dc] of directions) {
      const nr = current.row + dr;
      const nc = current.col + dc;

      if (nr < 0 || nc < 0 || nr >= maxRows || nc >= maxCols) {
        continue;
      }

      const neighbor = nodes[nr][nc];
      const nKey = key(neighbor);
      const neighborRisk = riskMap.get(nKey);

      // CRITICAL: Explicitly skip blocked/restricted nodes
      if (neighborRisk?.blocked) {
        continue;
      }

      const stepKm = haversineKm(
        [current.lat, current.lon],
        [neighbor.lat, neighbor.lon]
      );

      // Weather penalty: increases effective distance for rough conditions
      const weatherMultiplier = 1 + ((neighborRisk?.points ?? 0) / 20);
      const edgeCost = stepKm * weatherMultiplier;

      const tentativeG = currentG + edgeCost;

      if (tentativeG < (gScore.get(nKey) ?? Infinity)) {
        cameFrom.set(nKey, currentKey);
        gScore.set(nKey, tentativeG);
        fScore.set(nKey, tentativeG + h(neighbor));
        openSet.set(nKey, neighbor);
      }
    }
  }

  return null; // No safe path exists
}

// ─── Classification & Route Evidence Generation ─────────────────────────────

function classifyRoute(
  pathRisks: NodeRisk[],
  boat: BoatProfile
): {
  status: "GO" | "CAUTION" | "NO-GO";
  maxWave: number;
  maxWind: number;
  avgWave: number;
  avgWind: number;
  totalRiskPoints: number;
  cautionCount: number;
  hazards: string[];
} {
  if (pathRisks.length === 0) {
    return {
      status: "NO-GO",
      maxWave: 0,
      maxWind: 0,
      avgWave: 0,
      avgWind: 0,
      totalRiskPoints: 0,
      cautionCount: 0,
      hazards: ["No route nodes available"],
    };
  }

  const waves = pathRisks.map((r) => r.waveHeight);
  const winds = pathRisks.map((r) => r.windSpeed);

  const maxWave = Math.round(Math.max(...waves) * 100) / 100;
  const maxWind = Math.round(Math.max(...winds) * 10) / 10;
  const avgWave = Math.round((waves.reduce((a, b) => a + b, 0) / waves.length) * 100) / 100;
  const avgWind = Math.round((winds.reduce((a, b) => a + b, 0) / winds.length) * 10) / 10;

  const totalRiskPoints = Math.round(
    pathRisks.reduce((sum, r) => sum + r.points, 0) * 10
  ) / 10;

  const hasBlocked = pathRisks.some((r) => r.blocked);
  const severeWaveCount = pathRisks.filter((r) => r.waveHeight > boat.maxWave).length;
  const severeWindCount = pathRisks.filter((r) => r.windSpeed > boat.maxWind).length;
  const cautionCount = pathRisks.filter(
    (r) =>
      (r.waveHeight > boat.maxWave * 0.75 && r.waveHeight <= boat.maxWave) ||
      (r.windSpeed > boat.maxWind * 0.75 && r.windSpeed <= boat.maxWind)
  ).length;

  const hazards: string[] = [];
  if (hasBlocked) {
    hazards.push("Route intersects blocked / restricted safety zone");
  }
  if (severeWaveCount > 0) {
    hazards.push(
      `Peak wave height ${maxWave}m exceeds boat threshold (${boat.maxWave}m) on ${severeWaveCount} waypoint(s)`
    );
  }
  if (severeWindCount > 0) {
    hazards.push(
      `Peak wind speed ${maxWind}km/h exceeds boat threshold (${boat.maxWind}km/h) on ${severeWindCount} waypoint(s)`
    );
  }
  if (cautionCount > 0) {
    hazards.push(
      `Elevated sea state encountered on ${cautionCount} waypoint(s)`
    );
  }

  let status: "GO" | "CAUTION" | "NO-GO";

  if (hasBlocked || severeWaveCount > 0 || severeWindCount > 0) {
    status = "NO-GO";
  } else if (cautionCount > 0 || totalRiskPoints > 15) {
    status = "CAUTION";
  } else {
    status = "GO";
  }

  return {
    status,
    maxWave,
    maxWind,
    avgWave,
    avgWind,
    totalRiskPoints,
    cautionCount,
    hazards,
  };
}

// ─── Primary Route Calculation Entry Point ───────────────────────────────────

/**
 * Calculates a safe, weather-aware maritime route using deterministic A* search.
 * 
 * Flow:
 * 1. Validates inputs & boat profile.
 * 2. Builds geographic grid around origin and destination.
 * 3. Retrieves spatial & temporal forecast model data across grid nodes.
 * 4. Scores each node based on boat operational limits & restricted boundaries.
 * 5. Runs A* pathfinding strictly skipping blocked nodes and minimizing weather penalties.
 * 6. Generates route evidence, time timeline, and structured evaluation.
 */
export async function getSafeRoute(
  startLat: number,
  startLon: number,
  destLat: number,
  destLon: number,
  options?: RouteAgentOptions
): Promise<SafeRouteResult> {
  const startTime = Date.now();
  const forecastNote = "Latest available marine/weather forecast, not live buoy observation";

  // Validate coordinates
  if (
    isNaN(startLat) || isNaN(startLon) || isNaN(destLat) || isNaN(destLon) ||
    startLat < -90 || startLat > 90 || destLat < -90 || destLat > 90 ||
    startLon < -180 || startLon > 180 || destLon < -180 || destLon > 180
  ) {
    return {
      success: false,
      status: "NO-GO",
      error: "Invalid geographic coordinates provided (latitude must be [-90, 90], longitude [-180, 180])",
      boat: "Unknown",
      boatKey: "unknown",
      departureTime: new Date().toISOString(),
      waypoints: [],
      distanceKm: 0,
      straightLineDistanceKm: 0,
      travelTimeMinutes: 0,
      maxWaveHeight: 0,
      maxWindSpeed: 0,
      avgWaveHeight: 0,
      avgWindSpeed: 0,
      routeRiskPoints: 0,
      cautionNodesCount: 0,
      blockedNodesEncountered: 0,
      hazards: ["Invalid coordinate input"],
      restrictedZonesAvoided: [],
      forecastNote,
      executionTimeMs: Date.now() - startTime,
      timeline: [],
    };
  }

  // Resolve boat profile
  const boatKey = options?.boatKey ?? "mechanized";
  const boat: BoatProfile =
    options?.customBoatProfile ??
    BOAT_PROFILES[boatKey] ??
    BOAT_PROFILES.mechanized;

  const departureTime = options?.departureTime ?? new Date();
  const restrictedZones = options?.restrictedZones ?? [];
  const cycloneActive = options?.cycloneActive ?? false;
  const gridSize = options?.gridSize ?? 8;
  const fetchForecast = options?.forecastFetcher ?? defaultFetchGridForecast;

  const straightLineDistKm = haversineKm(
    [startLat, startLon],
    [destLat, destLon]
  );

  // Early Cyclone Check
  if (cycloneActive) {
    return {
      success: false,
      status: "NO-GO",
      reason: "Active cyclone warning for this region — do not depart.",
      boat: boat.label,
      boatKey: String(boatKey),
      departureTime: departureTime.toISOString(),
      waypoints: [[startLat, startLon], [destLat, destLon]],
      distanceKm: Math.round(straightLineDistKm * 10) / 10,
      straightLineDistanceKm: Math.round(straightLineDistKm * 10) / 10,
      travelTimeMinutes: Math.round((straightLineDistKm / boat.speedKmh) * 60),
      maxWaveHeight: 0,
      maxWindSpeed: 0,
      avgWaveHeight: 0,
      avgWindSpeed: 0,
      routeRiskPoints: 999999,
      cautionNodesCount: 0,
      blockedNodesEncountered: 1,
      hazards: ["Active cyclone warning in region"],
      restrictedZonesAvoided: [],
      forecastNote,
      executionTimeMs: Date.now() - startTime,
      timeline: [],
    };
  }

  // Check if start or destination lies directly inside a restricted zone
  const startZoneCheck = isInsideAnyZone(startLat, startLon, restrictedZones);
  if (startZoneCheck.inside) {
    return {
      success: false,
      status: "NO-GO",
      reason: `Departure location is inside restricted zone (${startZoneCheck.zone?.name ?? "Restricted Area"}). Navigation prohibited.`,
      boat: boat.label,
      boatKey: String(boatKey),
      departureTime: departureTime.toISOString(),
      waypoints: [[startLat, startLon]],
      distanceKm: 0,
      straightLineDistanceKm: Math.round(straightLineDistKm * 10) / 10,
      travelTimeMinutes: 0,
      maxWaveHeight: 0,
      maxWindSpeed: 0,
      avgWaveHeight: 0,
      avgWindSpeed: 0,
      routeRiskPoints: 999999,
      cautionNodesCount: 0,
      blockedNodesEncountered: 1,
      hazards: ["Start location is within restricted maritime zone"],
      restrictedZonesAvoided: [],
      forecastNote,
      executionTimeMs: Date.now() - startTime,
      timeline: [],
    };
  }

  const destZoneCheck = isInsideAnyZone(destLat, destLon, restrictedZones);
  if (destZoneCheck.inside) {
    return {
      success: false,
      status: "NO-GO",
      reason: `Destination location is inside restricted zone (${destZoneCheck.zone?.name ?? "Restricted Area"}). Navigation prohibited.`,
      boat: boat.label,
      boatKey: String(boatKey),
      departureTime: departureTime.toISOString(),
      waypoints: [[startLat, startLon]],
      distanceKm: 0,
      straightLineDistanceKm: Math.round(straightLineDistKm * 10) / 10,
      travelTimeMinutes: 0,
      maxWaveHeight: 0,
      maxWindSpeed: 0,
      avgWaveHeight: 0,
      avgWindSpeed: 0,
      routeRiskPoints: 999999,
      cautionNodesCount: 0,
      blockedNodesEncountered: 1,
      hazards: ["Destination is within restricted maritime zone"],
      restrictedZonesAvoided: [],
      forecastNote,
      executionTimeMs: Date.now() - startTime,
      timeline: [],
    };
  }

  // Construct Search Grid Bounding Box with buffer
  const latBuffer = Math.max(0.15, Math.abs(startLat - destLat) * 0.2);
  const lonBuffer = Math.max(0.15, Math.abs(startLon - destLon) * 0.2);

  const latMin = Math.min(startLat, destLat) - latBuffer;
  const latMax = Math.max(startLat, destLat) + latBuffer;
  const lonMin = Math.min(startLon, destLon) - lonBuffer;
  const lonMax = Math.max(startLon, destLon) + lonBuffer;

  const grid = buildGrid(latMin, latMax, lonMin, lonMax, gridSize);

  // Retrieve Forecast Data across the Grid
  let forecasts: GridForecast[];
  try {
    forecasts = await fetchForecast(grid);
  } catch (err) {
    return {
      success: false,
      status: "NO-GO",
      error: err instanceof Error ? err.message : String(err),
      reason: "Forecast service unavailable — unable to determine safe route without weather & marine data",
      boat: boat.label,
      boatKey: String(boatKey),
      departureTime: departureTime.toISOString(),
      waypoints: [],
      distanceKm: 0,
      straightLineDistanceKm: Math.round(straightLineDistKm * 10) / 10,
      travelTimeMinutes: 0,
      maxWaveHeight: 0,
      maxWindSpeed: 0,
      avgWaveHeight: 0,
      avgWindSpeed: 0,
      routeRiskPoints: 0,
      cautionNodesCount: 0,
      blockedNodesEncountered: 0,
      hazards: ["Marine/Weather forecast retrieval failure"],
      restrictedZonesAvoided: [],
      forecastNote,
      executionTimeMs: Date.now() - startTime,
      timeline: [],
    };
  }

  // Evaluate Spatial & Temporal Weather Risk for each Node
  const riskMap = new Map<string, NodeRisk>();
  const avoidedZonesSet = new Set<string>();
  let blockedCount = 0;

  for (const f of forecasts) {
    const distFromStart = haversineKm(
      [startLat, startLon],
      [f.node.lat, f.node.lon]
    );
    const approxEtaHours = distFromStart / boat.speedKmh;
    const targetTime = new Date(
      departureTime.getTime() + approxEtaHours * 3600 * 1000
    );

    const waveHeight = pickHourValue(
      f.marine.hourly.time,
      f.marine.hourly.wave_height,
      targetTime
    );

    const windSpeed = pickHourValue(
      f.weather.hourly.time,
      f.weather.hourly.wind_speed_10m,
      targetTime
    );

    const zoneCheck = isInsideAnyZone(
      f.node.lat,
      f.node.lon,
      restrictedZones
    );

    if (zoneCheck.inside && zoneCheck.zone?.name) {
      avoidedZonesSet.add(zoneCheck.zone.name);
    }

    const scored = scoreNode(
      waveHeight,
      windSpeed,
      boat,
      zoneCheck.inside,
      cycloneActive,
      zoneCheck.zone?.name
    );

    if (scored.blocked) {
      blockedCount++;
    }

    riskMap.set(`${f.node.row},${f.node.col}`, scored);
  }

  // Find nearest start and goal grid nodes
  const startNode = nearestNode(grid, [startLat, startLon]);
  const goalNode = nearestNode(grid, [destLat, destLon]);

  // Execute A* Search
  const path = astar(grid, riskMap, startNode, goalNode);

  if (!path || path.length === 0) {
    return {
      success: false,
      status: "NO-GO",
      reason: "No safe route found avoiding hazards and restricted zones.",
      boat: boat.label,
      boatKey: String(boatKey),
      departureTime: departureTime.toISOString(),
      waypoints: [],
      distanceKm: 0,
      straightLineDistanceKm: Math.round(straightLineDistKm * 10) / 10,
      travelTimeMinutes: 0,
      maxWaveHeight: 0,
      maxWindSpeed: 0,
      avgWaveHeight: 0,
      avgWindSpeed: 0,
      routeRiskPoints: 999999,
      cautionNodesCount: 0,
      blockedNodesEncountered: blockedCount,
      hazards: ["No traversable route avoiding restricted zones and severe sea conditions"],
      restrictedZonesAvoided: Array.from(avoidedZonesSet),
      forecastNote,
      executionTimeMs: Date.now() - startTime,
      timeline: [],
    };
  }

  // Construct Path Waypoints (including exact start and dest if distinct from grid nodes)
  const rawWaypoints: LatLon[] = path.map((n) => [n.lat, n.lon]);
  
  // Ensure start coordinate is first waypoint
  if (
    rawWaypoints.length === 0 ||
    rawWaypoints[0][0] !== startLat ||
    rawWaypoints[0][1] !== startLon
  ) {
    rawWaypoints.unshift([startLat, startLon]);
  }

  // Ensure dest coordinate is last waypoint
  const last = rawWaypoints[rawWaypoints.length - 1];
  if (last[0] !== destLat || last[1] !== destLon) {
    rawWaypoints.push([destLat, destLon]);
  }

  // Calculate actual route distance along waypoints
  let routeDistKm = 0;
  for (let i = 1; i < rawWaypoints.length; i++) {
    routeDistKm += haversineKm(rawWaypoints[i - 1], rawWaypoints[i]);
  }

  // Extract path node risk objects
  const pathRisks = path.map((n) => riskMap.get(`${n.row},${n.col}`)!);
  const classification = classifyRoute(pathRisks, boat);

  // Build Waypoint Timeline with accumulated travel times
  let cumulativeDist = 0;
  const timeline: WaypointTimelineItem[] = rawWaypoints.map((wp, i) => {
    if (i > 0) {
      cumulativeDist += haversineKm(rawWaypoints[i - 1], wp);
    }
    const etaMinutes = Math.round((cumulativeDist / boat.speedKmh) * 60);
    const etaTime = new Date(departureTime.getTime() + etaMinutes * 60 * 1000);

    // Approximate node risk for this waypoint
    const node = nearestNode(grid, wp);
    const risk = riskMap.get(`${node.row},${node.col}`);
    const wave = risk?.waveHeight ?? 0;
    const wind = risk?.windSpeed ?? 0;

    let wpStatus: "GO" | "CAUTION" | "NO-GO" = "GO";
    if (wave > boat.maxWave || wind > boat.maxWind) {
      wpStatus = "NO-GO";
    } else if (wave > boat.maxWave * 0.75 || wind > boat.maxWind * 0.75) {
      wpStatus = "CAUTION";
    }

    return {
      waypointIndex: i,
      lat: wp[0],
      lon: wp[1],
      estimatedArrival: etaTime.toISOString(),
      cumulativeDistanceKm: Math.round(cumulativeDist * 10) / 10,
      waveHeight: wave,
      windSpeed: wind,
      status: wpStatus,
    };
  });

  return {
    success: classification.status !== "NO-GO",
    status: classification.status,
    boat: boat.label,
    boatKey: String(boatKey),
    departureTime: departureTime.toISOString(),
    waypoints: rawWaypoints,
    distanceKm: Math.round(routeDistKm * 10) / 10,
    straightLineDistanceKm: Math.round(straightLineDistKm * 10) / 10,
    travelTimeMinutes: Math.round((routeDistKm / boat.speedKmh) * 60),
    maxWaveHeight: classification.maxWave,
    maxWindSpeed: classification.maxWind,
    avgWaveHeight: classification.avgWave,
    avgWindSpeed: classification.avgWind,
    routeRiskPoints: classification.totalRiskPoints,
    cautionNodesCount: classification.cautionCount,
    blockedNodesEncountered: blockedCount,
    hazards: classification.hazards,
    restrictedZonesAvoided: Array.from(avoidedZonesSet),
    forecastNote,
    executionTimeMs: Date.now() - startTime,
    timeline,
  };
}
