import { OrcaState } from './OrcaState';
import { SystemMessage } from '@langchain/core/messages';
import { groqModelRouter } from '../llm/GroqModelRouter';
import { getSatelliteProvider } from '../services/satellite';
import { getWeatherProvider } from '../services/weather';
import { getOceanProvider } from '../services/ocean';
import { getAdvisoryProvider } from '../services/advisories';
import { getGeospatialProvider } from '../services/geospatial';
import { getSafeRoute } from './routeAgent';

function parseLocationsFromQuery(query: string) {
  const q = query.toLowerCase();
  const origin = { name: 'Chennai Harbour', lat: 13.0827, lon: 80.2707 };
  let dest: { name: string, lat: number, lon: number } | null = null;

  if (q.includes('puducherry') || q.includes('pondicherry')) {
    dest = { name: 'Puducherry Port', lat: 11.9416, lon: 79.8083 };
  } else if (q.includes('nagapattinam')) {
    dest = { name: 'Nagapattinam Port', lat: 10.7656, lon: 79.8424 };
  } else if (q.includes('kakinada')) {
    dest = { name: 'Kakinada Coast', lat: 16.9891, lon: 82.2475 };
  } else if (q.includes('fishing ground') || q.includes('fishing')) {
    dest = { name: 'Offshore Fishing Ground', lat: 13.2500, lon: 80.5000 };
  }

  return { origin, dest };
}

/**
 * Returns the request-scoped set of already-executed agents.
 * The set is stored in contextData._executedAgents (serialized as array).
 */
function getExecutedSet(state: typeof OrcaState.State): Set<string> {
  const arr = state.contextData?._executedAgents;
  return new Set(Array.isArray(arr) ? arr : []);
}

function markExecuted(agentName: string, currentSet: Set<string>): string[] {
  currentSet.add(agentName);
  return Array.from(currentSet);
}

// ──────────────────────────────────────────────────────────────────────────────
// Planner Agent — determines high-level intent via LLM
// ──────────────────────────────────────────────────────────────────────────────
export const plannerAgent = async (state: typeof OrcaState.State) => {
  console.log('[Planner Agent] Started');
  const prompt = `You are the ORCA Planner Agent. Analyze the user's query and determine the intent.
Possible intents: 'weather', 'fishing', 'trip_planning', 'safety', 'general'.
Query: "${state.query}"
Respond with ONLY the intent string.`;

  const response = await groqModelRouter.invoke([new SystemMessage(prompt)], 'planning');
  const intent = response.response.trim().toLowerCase();
  console.log(`[Planner Agent] Intent: ${intent}`);
  console.log('[Planner Agent] Completed');

  return {
    intent,
    executedSteps: ['plannerAgent']
  };
};

// ──────────────────────────────────────────────────────────────────────────────
// Data Discovery Agent — determines which data agents are required
// ──────────────────────────────────────────────────────────────────────────────
export const dataDiscoveryAgent = async (state: typeof OrcaState.State) => {
  return {
    executedSteps: ['dataDiscoveryAgent']
  };
};

// ──────────────────────────────────────────────────────────────────────────────
// Agent Router — logs required agents, protects against duplicates
// ──────────────────────────────────────────────────────────────────────────────
export const agentRouterNode = async (state: typeof OrcaState.State) => {
  const queryLower = state.query.toLowerCase();
  const intent = state.intent ?? 'general';

  // Determine which agents are needed for this request
  const needsWeather = true; // always useful
  const needsOcean = true;   // always useful
  const needsSatellite = intent === 'fishing' || intent === 'trip_planning' ||
    queryLower.includes('satellite') || queryLower.includes('chlorophyll') ||
    queryLower.includes('sst') || queryLower.includes('pfz') || queryLower.includes('fishing');
  const needsGeospatial = intent === 'fishing' || intent === 'trip_planning' || intent === 'safety' ||
    queryLower.includes('boundary') || queryLower.includes('restricted') ||
    queryLower.includes('safe') || queryLower.includes('trip') ||
    queryLower.includes('travel') || queryLower.includes('alert') ||
    queryLower.includes('geospatial');
  const needsAlert = intent === 'fishing' || intent === 'trip_planning' || intent === 'safety' ||
    intent === 'weather' || queryLower.includes('alert') || queryLower.includes('warning') ||
    queryLower.includes('trip') || queryLower.includes('travel') || queryLower.includes('fishing');
  const needsRisk = intent === 'fishing' || intent === 'trip_planning' || intent === 'safety' ||
    queryLower.includes('safe') || queryLower.includes('trip') ||
    queryLower.includes('travel') || queryLower.includes('danger');

  const requiredAgents = [
    'weather',
    'ocean',
    ...(needsSatellite ? ['satellite'] : []),
    ...(needsGeospatial ? ['geospatial'] : []),
    ...(needsAlert ? ['alert'] : []),
    ...(needsRisk ? ['risk'] : []),
    'synthesis',
  ];

  console.log(`[Agent Router] Required agents: ${requiredAgents.join(', ')}`);

  // Initialise the request-scoped deduplication set
  return {
    contextData: {
      _requiredAgents: requiredAgents,
      _executedAgents: [],
    },
    executedSteps: ['agentRouterNode'],
  };
};

// ──────────────────────────────────────────────────────────────────────────────
// Weather Agent
// ──────────────────────────────────────────────────────────────────────────────
export const weatherAgent = async (state: typeof OrcaState.State) => {
  const executedSet = getExecutedSet(state);
  if (executedSet.has('weatherAgent')) {
    console.log('[Agent Router] Skipping duplicate agent: weatherAgent');
    return {};
  }

  const location = state.contextData?.location;
  if (!location || typeof location.lat !== 'number' || typeof location.lon !== 'number') {
    console.warn('[Weather Agent] No valid location coordinates in state context.');
    console.log('[Weather Agent] Completed');
    const updated = markExecuted('weatherAgent', executedSet);
    return {
      contextData: { weather: null, weatherStatus: 'PROVIDER_UNAVAILABLE', weatherError: 'Invalid or missing location coordinates.', _executedAgents: updated },
      executedSteps: ['weatherAgent'],
    };
  }

  console.log('[Agent Router] Executing: weatherAgent');
  console.log(`[Weather Agent] Started`);
  console.log(`[Weather Agent] Location: lat=${location.lat.toFixed(4)}, lon=${location.lon.toFixed(4)}`);
  const provider = getWeatherProvider();
  try {
    const result = await provider.getCurrentConditions({ lat: location.lat, lon: location.lon });
    const { data: weatherData, status } = result;
    console.log(`[Weather Agent] Provider status: ${status}`);
    console.log(`[Weather Agent] Completed`);
    const updated = markExecuted('weatherAgent', executedSet);
    return {
      contextData: { weather: weatherData ?? null, weatherStatus: status, _executedAgents: updated },
      executedSteps: ['weatherAgent'],
    };
  } catch (error) {
    console.error('[Weather Agent] Failed to fetch weather:', error);
    console.log(`[Weather Agent] Completed`);
    const updated = markExecuted('weatherAgent', executedSet);
    return {
      contextData: { weather: null, weatherStatus: 'PROVIDER_UNAVAILABLE', weatherError: 'Weather provider is temporarily unavailable.', _executedAgents: updated },
      executedSteps: ['weatherAgent'],
    };
  }
};

// ──────────────────────────────────────────────────────────────────────────────
// Ocean Agent
// ──────────────────────────────────────────────────────────────────────────────
export const oceanAgent = async (state: typeof OrcaState.State) => {
  const executedSet = getExecutedSet(state);
  if (executedSet.has('oceanAgent')) {
    console.log('[Agent Router] Skipping duplicate agent: oceanAgent');
    return {};
  }

  const location = state.contextData?.location;
  if (!location || typeof location.lat !== 'number' || typeof location.lon !== 'number') {
    console.warn('[Ocean Agent] No valid location coordinates in state context.');
    const updated = markExecuted('oceanAgent', executedSet);
    return { contextData: { ocean: null, oceanStatus: 'PROVIDER_UNAVAILABLE', _executedAgents: updated }, executedSteps: ['oceanAgent'] };
  }

  console.log('[Agent Router] Executing: oceanAgent');
  console.log(`[Ocean Agent] Started`);
  console.log(`[Ocean Agent] Location: lat=${location.lat.toFixed(4)}, lon=${location.lon.toFixed(4)}`);
  const provider = getOceanProvider();
  try {
    const result = await provider.getSnapshot({ lat: location.lat, lon: location.lon });
    const { data: oceanSnapshot, status } = result;
    console.log(`[Ocean Agent] Provider status: ${status}`);
    console.log(`[Ocean Agent] Completed`);
    const updated = markExecuted('oceanAgent', executedSet);
    return { contextData: { ocean: oceanSnapshot ?? null, oceanStatus: status, _executedAgents: updated }, executedSteps: ['oceanAgent'] };
  } catch (error) {
    console.error('[Ocean Agent] Error fetching ocean snapshot:', error);
    console.log(`[Ocean Agent] Completed`);
    const updated = markExecuted('oceanAgent', executedSet);
    return { contextData: { ocean: null, oceanStatus: 'PROVIDER_UNAVAILABLE', oceanError: 'Ocean provider is temporarily unavailable.', _executedAgents: updated }, executedSteps: ['oceanAgent'] };
  }
};

// ──────────────────────────────────────────────────────────────────────────────
// Satellite Agent
// ──────────────────────────────────────────────────────────────────────────────
export const satelliteAgent = async (state: typeof OrcaState.State) => {
  const executedSet = getExecutedSet(state);
  if (executedSet.has('satelliteAgent')) {
    console.log('[Agent Router] Skipping duplicate agent: satelliteAgent');
    return {};
  }

  const queryLower = state.query.toLowerCase();
  const isRelevant = state.intent === 'fishing' || state.intent === 'trip_planning' ||
    queryLower.includes('satellite') || queryLower.includes('imagery') ||
    queryLower.includes('chlorophyll') || queryLower.includes('sst') ||
    queryLower.includes('pfz') || queryLower.includes('fishing');

  if (!isRelevant) {
    return {};
  }

  const location = state.contextData?.location;
  if (!location || typeof location.lat !== 'number' || typeof location.lon !== 'number') {
    console.warn('[Satellite Agent] No valid location coordinates in state context.');
    console.log('[Satellite Agent] Completed');
    const updated = markExecuted('satelliteAgent', executedSet);
    return {
      contextData: { satellite: null, _executedAgents: updated },
      executedSteps: ['satelliteAgent'],
    };
  }

  console.log('[Agent Router] Executing: satelliteAgent');
  console.log(`[Satellite Agent] Started`);
  console.log(`[Satellite Agent] Location: lat=${location.lat.toFixed(4)}, lon=${location.lon.toFixed(4)}`);

  try {
    const provider = getSatelliteProvider();
    const result = await provider.getSnapshot({ lat: location.lat, lon: location.lon });
    const { data, status, error } = result;
    console.log(`[Satellite Agent] Provider status: ${status}`);
    console.log(`[Satellite Agent] Completed`);
    const updated = markExecuted('satelliteAgent', executedSet);
    return {
      contextData: {
        satellite: data || null,
        satelliteStatus: status,
        satelliteError: error || null,
        _executedAgents: updated,
      },
      executedSteps: ['satelliteAgent'],
    };
  } catch (error) {
    console.error('[Satellite Agent] Error fetching satellite snapshot:', error);
    console.log('[Satellite Agent] Completed');
    const updated = markExecuted('satelliteAgent', executedSet);
    return {
      contextData: { satellite: null, satelliteStatus: 'PROVIDER_UNAVAILABLE', satelliteError: 'Satellite provider is temporarily unavailable.', _executedAgents: updated },
      executedSteps: ['satelliteAgent'],
    };
  }
};

// ──────────────────────────────────────────────────────────────────────────────
// Geospatial Agent
// ──────────────────────────────────────────────────────────────────────────────
export const geospatialAgent = async (state: typeof OrcaState.State) => {
  const executedSet = getExecutedSet(state);
  if (executedSet.has('geospatialAgent')) {
    console.log('[Agent Router] Skipping duplicate agent: geospatialAgent');
    return {};
  }

  const queryLower = state.query.toLowerCase();
  const isRelevant = state.intent === 'fishing' || state.intent === 'trip_planning' || state.intent === 'safety' ||
    queryLower.includes('boundary') || queryLower.includes('restricted') ||
    queryLower.includes('safe') || queryLower.includes('trip') ||
    queryLower.includes('travel') || queryLower.includes('alert') ||
    queryLower.includes('geospatial');

  if (!isRelevant) {
    return {};
  }

  const location = state.contextData?.location;
  if (!location || typeof location.lat !== 'number' || typeof location.lon !== 'number') {
    console.warn('[Geospatial Agent] No valid location coordinates in state context.');
    console.log('[Geospatial Agent] Completed');
    const updated = markExecuted('geospatialAgent', executedSet);
    return {
      contextData: { geospatial: { nearInternationalBoundary: false, nearRestrictedZone: false }, geospatialStatus: 'PROVIDER_UNAVAILABLE', _executedAgents: updated },
      executedSteps: ['geospatialAgent'],
    };
  }

  console.log('[Agent Router] Executing: geospatialAgent');
  console.log('[Geospatial Agent] Started');
  const geoProv = getGeospatialProvider();
  try {
    const result = await geoProv.analyseRoute(
      { lat: location.lat, lon: location.lon },
      { lat: location.lat, lon: location.lon },
      []
    );
    const { data, status, error } = result;
    console.log('[Geospatial Agent] Provider status:', status);
    console.log('[Geospatial Agent] Completed');
    const updated = markExecuted('geospatialAgent', executedSet);
    return {
      contextData: {
        geospatial: data || { nearInternationalBoundary: false, nearRestrictedZone: false },
        geospatialStatus: status,
        geospatialError: error || null,
        _executedAgents: updated,
      },
      executedSteps: ['geospatialAgent'],
    };
  } catch (err) {
    console.error('[Geospatial Agent] Error running geospatial checks:', err);
    console.log('[Geospatial Agent] Completed');
    const updated = markExecuted('geospatialAgent', executedSet);
    return {
      contextData: {
        geospatial: { nearInternationalBoundary: false, nearRestrictedZone: false },
        geospatialStatus: 'PROVIDER_UNAVAILABLE',
        geospatialError: 'Geospatial provider could not be reached.',
        _executedAgents: updated,
      },
      executedSteps: ['geospatialAgent'],
    };
  }
};

// ──────────────────────────────────────────────────────────────────────────────
// Alert Agent
// ──────────────────────────────────────────────────────────────────────────────
export const alertAgent = async (state: typeof OrcaState.State) => {
  const executedSet = getExecutedSet(state);
  if (executedSet.has('alertAgent')) {
    console.log('[Agent Router] Skipping duplicate agent: alertAgent');
    return {};
  }

  const queryLower = state.query.toLowerCase();
  const isRelevant = state.intent === 'fishing' || state.intent === 'trip_planning' ||
    state.intent === 'safety' || state.intent === 'weather' ||
    queryLower.includes('alert') || queryLower.includes('warning') ||
    queryLower.includes('trip') || queryLower.includes('travel') || queryLower.includes('fishing');

  if (!isRelevant) {
    return {};
  }

  const location = state.contextData?.location;
  if (!location || typeof location.lat !== 'number' || typeof location.lon !== 'number') {
    const updated = markExecuted('alertAgent', executedSet);
    return {
      contextData: { alerts: [], alertStatus: 'PROVIDER_UNAVAILABLE', alertError: 'Invalid or missing location coordinates.', _executedAgents: updated },
      executedSteps: ['alertAgent'],
    };
  }

  const locName = location.name || `${location.lat.toFixed(2)}, ${location.lon.toFixed(2)}`;
  console.log('[Agent Router] Executing: alertAgent');
  console.log('[Alert Agent] Started');
  console.log(`[Alert Agent] Location: ${locName}`);

  try {
    const activeAlerts = await getAdvisoryProvider().getActiveAlerts({ lat: location.lat, lon: location.lon });
    // 0 alerts = REAL_DATA_EMPTY (provider responded, no data for this query)
    const status = activeAlerts.length > 0 ? 'REAL_DATA_SUCCESS' : 'REAL_DATA_EMPTY';
    console.log(`[Alert Agent] Active alerts: ${activeAlerts.length} — status: ${status}`);
    console.log('[Alert Agent] Completed');
    const updated = markExecuted('alertAgent', executedSet);
    return {
      contextData: { alerts: activeAlerts, alertStatus: status, alertError: null, _executedAgents: updated },
      executedSteps: ['alertAgent'],
    };
  } catch (error) {
    console.error('[Alert Agent] Error fetching active alerts:', error);
    console.log('[Alert Agent] Completed');
    const updated = markExecuted('alertAgent', executedSet);
    return {
      contextData: { alerts: [], alertStatus: 'PROVIDER_UNAVAILABLE', alertError: 'Alert provider is temporarily unavailable.', _executedAgents: updated },
      executedSteps: ['alertAgent'],
    };
  }
};

// ──────────────────────────────────────────────────────────────────────────────
// Risk Agent — deterministic risk engine, never overrides with LLM
// ──────────────────────────────────────────────────────────────────────────────
export const riskAgent = async (state: typeof OrcaState.State) => {
  const executedSet = getExecutedSet(state);
  if (executedSet.has('riskAgent')) {
    console.log('[Agent Router] Skipping duplicate agent: riskAgent');
    return {};
  }

  const queryLower = state.query.toLowerCase();
  const isRelevant = state.intent === 'fishing' || state.intent === 'trip_planning' || state.intent === 'safety' ||
    queryLower.includes('safe') || queryLower.includes('trip') ||
    queryLower.includes('travel') || queryLower.includes('danger');

  if (!isRelevant) {
    return {};
  }

  console.log('[Agent Router] Executing: riskAgent');

  const { weather, ocean, geospatial, alerts,
    weatherStatus, oceanStatus, satelliteStatus, geospatialStatus, alertStatus } = state.contextData;
  let status: 'GO' | 'CAUTION' | 'NO_GO' = 'GO';
  const reasons: string[] = [];

  // ── Provider status handling — explicit distinction between empty and unavailable ──
  const providerUnavailable: string[] = [];
  const providerEmpty: string[] = [];

  if (weatherStatus === 'PROVIDER_UNAVAILABLE') providerUnavailable.push('weather');
  else if (weatherStatus === 'REAL_DATA_EMPTY') providerEmpty.push('weather');

  if (oceanStatus === 'PROVIDER_UNAVAILABLE') providerUnavailable.push('ocean');
  else if (oceanStatus === 'REAL_DATA_EMPTY') providerEmpty.push('ocean');

  if (satelliteStatus === 'PROVIDER_UNAVAILABLE') providerUnavailable.push('satellite');
  else if (satelliteStatus === 'REAL_DATA_EMPTY') providerEmpty.push('satellite');

  if (geospatialStatus === 'PROVIDER_UNAVAILABLE') providerUnavailable.push('geospatial');
  else if (geospatialStatus === 'REAL_DATA_EMPTY') providerEmpty.push('geospatial');

  if (alertStatus === 'PROVIDER_UNAVAILABLE') {
    providerUnavailable.push('alert');
  }
  // NOTE: alertStatus === 'REAL_DATA_EMPTY' means "no active alerts" — that is expected and normal, not uncertainty

  if (providerUnavailable.length > 0) {
    status = 'CAUTION';
    reasons.push(`The following data providers could not be reached: ${providerUnavailable.join(', ')}. Safety assessment is based on incomplete information.`);
  }

  if (providerEmpty.length > 0) {
    if (status === 'GO') status = 'CAUTION';
    reasons.push(`No data returned by the following providers for this location: ${providerEmpty.join(', ')}. Assessment may be incomplete.`);
  }

  const effectiveWaveHeight = ocean?.waveHeight ?? weather?.waveHeight ?? null;
  const effectiveSeaState = ocean?.seaState ?? weather?.seaState ?? null;
  const effectiveWindSpeed = weather?.windSpeed ?? null;

  const isGoodPFZ = ocean?.pfzScore && ocean.pfzScore > 0.7;
  const isHighWaves = effectiveWaveHeight !== null && effectiveWaveHeight > 2.5;
  const hasCycloneAlert = alerts && alerts.length > 0;
  const isNearBoundary = geospatial?.nearInternationalBoundary === true || geospatial?.routeNearBoundary === true;
  const isWorseningAfternoon = weather?.morningWind < 15 && weather?.afternoonWind > 25;
  const hasDangerousReturn = weather?.returnConditionsDangerous === true;

  if (isGoodPFZ && isHighWaves) {
    status = 'NO_GO';
    reasons.push('High wave conditions at target PFZ. Unsafe to operate despite good fish potential.');
  }

  if (isGoodPFZ && hasCycloneAlert) {
    status = 'NO_GO';
    reasons.push('Active cyclone advisory supersedes good PFZ conditions.');
  }

  if (isGoodPFZ && hasDangerousReturn && status !== 'NO_GO') {
    status = 'NO_GO';
    reasons.push('Return trip conditions are dangerous. Zone is not recommended.');
  }

  if (isGoodPFZ && isNearBoundary && status !== 'NO_GO') {
    status = 'CAUTION';
    reasons.push('Proximity to international boundary. Suggest planning a safer alternative route.');
  }

  if (isWorseningAfternoon && status !== 'NO_GO') {
    status = 'CAUTION';
    reasons.push('Weather will worsen in the afternoon. GO early and return before conditions become unsafe.');
  }

  if (status !== 'NO_GO') {
    if (effectiveWaveHeight === null) {
      status = 'NO_GO';
      reasons.push('Critical marine safety data (wave height) is unavailable. Cannot safely recommend GO without marine data.');
    } else if ((effectiveWindSpeed !== null && effectiveWindSpeed > 30) || effectiveWaveHeight > 2.5) {
      status = 'NO_GO';
      reasons.push('Dangerous general wind or wave conditions.');
    } else if ((effectiveWindSpeed !== null && effectiveWindSpeed > 20) || effectiveWaveHeight > 1.5) {
      status = 'CAUTION';
      reasons.push('Moderate wind/waves, exercise caution.');
    }
  }

  if (alertStatus === 'REAL_DATA_EMPTY') {
    reasons.push('No active marine alerts were returned by the alert provider for this location.');
  }

  if (status === 'GO' && reasons.length === 0) {
    reasons.push('All safety parameters are within normal limits.');
  }

  const updated = markExecuted('riskAgent', executedSet);
  return {
    contextData: { _executedAgents: updated },
    riskAssessment: {
      level: status,
      reasoning: reasons,
      evidence: {
        windSpeed: effectiveWindSpeed,
        waveHeight: effectiveWaveHeight,
        swellPeriod: ocean?.swellPeriod ?? weather?.swellPeriod ?? null,
        seaState: effectiveSeaState,
        waveDirection: ocean?.waveDirection ?? null,
        currentSpeed: ocean?.currentSpeed ?? null,
      },
    },
    executedSteps: ['riskAgent'],
  };
};

// ──────────────────────────────────────────────────────────────────────────────
// Route Agent
// ──────────────────────────────────────────────────────────────────────────────
export const routeAgent = async (state: typeof OrcaState.State) => {
  const { origin, dest } = parseLocationsFromQuery(state.query);
  const isRelevant = (state.intent === 'trip_planning' || state.query.toLowerCase().includes('trip') || state.query.toLowerCase().includes('travel') || state.query.toLowerCase().includes('from')) && dest !== null;

  if (!isRelevant || !dest) {
    return {};
  }

  try {
    console.log(`[Route Agent] Started`);
    console.log(`[Route Agent] Route: ${origin.name} -> ${dest.name}`);
    const routePlan = await getSafeRoute(origin.lat, origin.lon, dest.lat, dest.lon, {
      boatKey: 'mechanized',
      departureTime: new Date()
    });
    console.log(`[Route Agent] Completed`);

    return {
      routePlan,
      executedSteps: ['routeAgent']
    };
  } catch (error) {
    console.error('[Route Agent] Error calculating route:', error);
    return {
      executedSteps: ['routeAgent']
    };
  }
};

// ──────────────────────────────────────────────────────────────────────────────
// Synthesis Agent — formats the structured context into clean markdown
// ──────────────────────────────────────────────────────────────────────────────

/** Build a clean, structured summary of available data without raw JSON dump */
function buildStructuredContext(state: typeof OrcaState.State): string {
  const ctx = state.contextData;
  const location = ctx.location;
  const weather = ctx.weather;
  const ocean = ctx.ocean;
  const satellite = ctx.satellite;
  const geospatial = ctx.geospatial;
  const alerts: any[] = ctx.alerts ?? [];

  const locStr = location?.name
    ? `${location.name} (lat=${location.lat?.toFixed(4)}, lon=${location.lon?.toFixed(4)})`
    : location
    ? `lat=${location.lat?.toFixed(4)}, lon=${location.lon?.toFixed(4)}`
    : 'Unknown location';

  const lines: string[] = [
    `LOCATION: ${locStr}`,
    '',
    '=== WEATHER ===',
  ];

  if (weather) {
    lines.push(`Status: ${ctx.weatherStatus ?? 'REAL_DATA_SUCCESS'}`);
    lines.push(`Temperature: ${weather.temperature != null ? weather.temperature + ' °C' : 'Unavailable'}`);
    lines.push(`Feels Like: ${weather.feelsLike != null ? weather.feelsLike + ' °C' : 'Unavailable'}`);
    lines.push(`Condition: ${weather.condition ?? 'Unavailable'}`);
    lines.push(`Wind Speed: ${weather.windSpeed != null ? weather.windSpeed + ' km/h' : 'Unavailable'}`);
    lines.push(`Wind Direction: ${weather.windDirection ?? 'Unavailable'}`);
    lines.push(`Humidity: ${weather.humidity != null ? weather.humidity + '%' : 'Unavailable'}`);
    lines.push(`Visibility: ${weather.visibility != null ? weather.visibility + ' m' : 'Unavailable'}`);
    lines.push(`Wave Height: ${weather.waveHeight != null ? weather.waveHeight + ' m' : 'Unavailable'}`);
    lines.push(`Swell Period: ${weather.swellPeriod != null ? weather.swellPeriod + ' s' : 'Unavailable'}`);
    lines.push(`Sea State: ${weather.seaState ?? 'Unavailable'}`);
    lines.push(`Rain Probability: ${weather.rainProbability != null ? weather.rainProbability + '%' : 'Unavailable'}`);
    lines.push(`Lightning Risk: ${weather.lightningRisk === true ? 'Yes' : weather.lightningRisk === false ? 'None reported' : 'Unavailable'}`);
  } else {
    lines.push(`Status: ${ctx.weatherStatus ?? 'PROVIDER_UNAVAILABLE'}`);
    lines.push('Weather data: Unavailable');
  }

  lines.push('');
  lines.push('=== OCEAN ===');
  if (ocean) {
    lines.push(`Status: ${ctx.oceanStatus ?? 'REAL_DATA_SUCCESS'}`);
    lines.push(`Wave Height: ${ocean.waveHeight != null ? ocean.waveHeight + ' m' : 'Unavailable'}`);
    lines.push(`Wave Direction: ${ocean.waveDirection != null ? ocean.waveDirection + '°' : 'Unavailable'}`);
    lines.push(`Swell Period: ${ocean.swellPeriod != null ? ocean.swellPeriod + ' s' : 'Unavailable'}`);
    lines.push(`Swell Direction: ${ocean.swellDirection ?? 'Unavailable'}`);
    lines.push(`Current Speed: ${ocean.currentSpeed != null ? ocean.currentSpeed + ' km/h' : 'Unavailable'}`);
    lines.push(`Current Direction: ${ocean.currentDirection ?? 'Unavailable'}`);
    lines.push(`Sea State: ${ocean.seaState ?? 'Unavailable'}`);
    lines.push(`SST: ${ocean.sst != null ? ocean.sst + ' °C' : 'Unavailable'}`);
    lines.push(`Chlorophyll: ${ocean.chlorophyll != null ? ocean.chlorophyll + ' mg/m³' : 'Unavailable'}`);
  } else {
    lines.push(`Status: ${ctx.oceanStatus ?? 'PROVIDER_UNAVAILABLE'}`);
    lines.push('Ocean data: Unavailable');
  }

  lines.push('');
  lines.push('=== SATELLITE ===');
  if (satellite) {
    lines.push(`Status: ${ctx.satelliteStatus ?? 'REAL_DATA_SUCCESS'}`);
    lines.push(`SST (satellite): ${satellite.sst != null ? satellite.sst + ' °C' : 'Unavailable'}`);
    lines.push(`Chlorophyll (satellite): ${satellite.chlorophyll != null ? satellite.chlorophyll + ' mg/m³' : 'Unavailable'}`);
    lines.push(`PFZ zones: ${satellite.pfzZones?.length ?? 0}`);
  } else if (ctx.satelliteStatus) {
    lines.push(`Status: ${ctx.satelliteStatus}`);
    lines.push(ctx.satelliteError ? `Error: ${ctx.satelliteError}` : 'Satellite data not available for this request.');
  } else {
    lines.push('Satellite data: Not requested for this query.');
  }

  lines.push('');
  lines.push('=== ALERTS ===');
  if (ctx.alertStatus === 'REAL_DATA_EMPTY') {
    lines.push('No active marine alerts found for this location.');
  } else if (ctx.alertStatus === 'PROVIDER_UNAVAILABLE') {
    lines.push(`Alert provider unavailable. ${ctx.alertError ?? ''}`);
  } else if (alerts.length > 0) {
    alerts.forEach((a: any) => lines.push(`- [${a.severity ?? 'UNKNOWN'}] ${a.title ?? a.type ?? 'Alert'}: ${a.description ?? ''}`));
  } else {
    lines.push('No alert data available.');
  }

  lines.push('');
  lines.push('=== GEOSPATIAL ===');
  if (geospatial && ctx.geospatialStatus !== 'PROVIDER_UNAVAILABLE') {
    lines.push(`Status: ${ctx.geospatialStatus ?? 'REAL_DATA_SUCCESS'}`);
    lines.push(`Near boundary: ${geospatial.routeNearBoundary === true || geospatial.nearInternationalBoundary === true ? 'Yes' : 'No'}`);
    lines.push(`Distance to boundary: ${geospatial.distanceToBoundaryNm != null ? geospatial.distanceToBoundaryNm + ' nm' : 'Unavailable'}`);
    lines.push(`Route intersects restricted zone: ${geospatial.routeIntersectsRestricted === true ? 'Yes' : 'No'}`);
  } else {
    lines.push(`Status: ${ctx.geospatialStatus ?? 'PROVIDER_UNAVAILABLE'}`);
    lines.push(ctx.geospatialError ?? 'Geospatial data unavailable.');
  }

  return lines.join('\n');
}

export const synthesisAgent = async (state: typeof OrcaState.State) => {
  if (state.finalResponse) {
    return {
      executedSteps: ['synthesisAgent']
    };
  }

  console.log('[Agent Router] Executing: synthesisAgent');
  console.log('[Agent Router] Execution complete');

  const structuredContext = buildStructuredContext(state);
  const riskDump = state.riskAssessment
    ? `Level: ${state.riskAssessment.level}\nReasons:\n${(state.riskAssessment.reasoning ?? []).map((r: string) => '- ' + r).join('\n')}`
    : 'Risk assessment not performed for this query.';

  const locationName = state.contextData.location?.name || 'the requested location';

  const prompt = `You are the ORCA Synthesis Agent. Provide a clear, professional, concise markdown response to a fisherman or marine operator.

STRICT RULES:
1. Use ONLY the data provided in the Structured Context below. Do NOT hallucinate or invent values.
2. NEVER use "-" as a placeholder. If a value is unavailable, write "Unavailable" or "No data available".
3. NEVER use a "Units / Notes" column in tables — only use "Parameter" and "Value" columns.
4. The value for each row must be the actual data value (e.g., "26.9 °C", "78%", "Unavailable").
5. Do NOT create empty rows or rows with only dashes.
6. Do NOT override or modify the Risk Assessment level — it is deterministic.
7. Use exact numbers from the context. Do not round or estimate differently.
8. Location to use: ${locationName}

Risk Assessment (DO NOT OVERRIDE):
${riskDump}

Structured Context:
${structuredContext}

User Query: "${state.query}"

Provide a professional markdown response covering the relevant data and the risk recommendation.`;

  const response = await groqModelRouter.invoke([new SystemMessage(prompt)], 'synthesis');

  return {
    finalResponse: response.response,
    executedSteps: ['synthesisAgent']
  };
};
