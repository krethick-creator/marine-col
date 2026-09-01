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

/**
 * Returns true when the agent is listed in _requiredAgents for this request.
 * Falls back to true (allow) when _requiredAgents is absent (backwards compat).
 */
function isAgentRequired(shortName: string, state: typeof OrcaState.State): boolean {
  const required: string[] | undefined = state.contextData?._requiredAgents;
  if (!Array.isArray(required)) return true; // no list yet → allow
  return required.includes(shortName);
}

// ──────────────────────────────────────────────────────────────────────────────
// Intent detection helpers
// ──────────────────────────────────────────────────────────────────────────────

// Rule-based conversational patterns — fast, no LLM call needed
const CONVERSATIONAL_PATTERNS = [
  /^(hi|hey|hello|hiya|howdy|yo)\b/i,
  /^(good\s+(morning|afternoon|evening|night|day))\b/i,
  /^(thanks|thank\s+you|thx|ty|cheers)\b/i,
  /^(bye|goodbye|see\s+you|cya|take\s+care)\b/i,
  /^(who\s+are\s+you|what\s+are\s+you)\b/i,
  /^(what\s+can\s+you\s+do|what\s+do\s+you\s+do|how\s+can\s+you\s+help|help\s+me|help)\b/i,
  /^(ok|okay|sure|alright|great|nice|cool|got\s+it|understood)\b/i,
  /^(tell\s+me\s+about\s+yourself)\b/i,
  /^(what\s+is\s+orca|who\s+is\s+orca)\b/i,
];

function detectConversationalIntent(query: string): boolean {
  const trimmed = query.trim();
  // Very short queries with no marine keywords are almost always conversational
  const marineKeywords = ['weather', 'ocean', 'wave', 'wind', 'satellite', 'chlorophyll',
    'sst', 'alert', 'warning', 'fishing', 'trip', 'safe', 'danger', 'cyclone',
    'tide', 'current', 'storm', 'rain', 'temperature', 'boundary', 'port', 'harbour',
    'pfz', 'sea', 'marine', 'boat', 'sail', 'vessel', 'navigate', 'coast', 'ship'];
  const hasMarineKeyword = marineKeywords.some(kw => trimmed.toLowerCase().includes(kw));
  if (hasMarineKeyword) return false;
  return CONVERSATIONAL_PATTERNS.some(p => p.test(trimmed));
}

// Map LLM intent strings to our canonical intent categories
function normalizeIntent(raw: string): string {
  const r = raw.toLowerCase().trim();
  // Strip surrounding quotes or whitespace the LLM might add
  const cleaned = r.replace(/^['"`]+|['"`]+$/g, '').trim();
  if (['conversational', 'greeting', 'casual', 'chitchat', 'chit-chat', 'help'].includes(cleaned)) return 'conversational';
  if (['weather', 'temperature', 'wind', 'rain', 'forecast'].includes(cleaned)) return 'weather';
  if (['ocean', 'wave', 'swell', 'tide', 'current', 'sea_state', 'sea state'].includes(cleaned)) return 'ocean';
  if (['satellite', 'sst', 'chlorophyll', 'pfz'].includes(cleaned)) return 'satellite';
  if (['alert', 'alerts', 'warning', 'cyclone', 'advisory'].includes(cleaned)) return 'alerts';
  if (['geospatial', 'boundary', 'zone', 'restricted'].includes(cleaned)) return 'geospatial';
  if (['safety', 'safe', 'danger', 'risk'].includes(cleaned)) return 'safety';
  if (['trip_planning', 'trip', 'navigate', 'navigation', 'route'].includes(cleaned)) return 'trip_planning';
  if (['fishing', 'fish', 'catch'].includes(cleaned)) return 'fishing';
  return 'general_marine';
}

// ──────────────────────────────────────────────────────────────────────────────
// Planner Agent — determines high-level intent
// ──────────────────────────────────────────────────────────────────────────────
export const plannerAgent = async (state: typeof OrcaState.State) => {
  console.log('[Planner Agent] Started');

  // Fast rule-based detection first — avoids an LLM call for greetings
  if (detectConversationalIntent(state.query)) {
    console.log('[Planner Agent] Intent: conversational (rule-based)');
    console.log('[Planner Agent] Completed');
    return { intent: 'conversational', executedSteps: ['plannerAgent'] };
  }

  const prompt = `You are the ORCA Planner Agent. Analyze the user's query and classify its intent.

Possible intents:
- conversational  (greetings, thanks, "who are you", "what can you do", small talk)
- weather         (temperature, wind, rain, forecast, humidity)
- ocean           (waves, swell, tides, currents, sea state)
- satellite       (SST satellite, chlorophyll, PFZ, remote sensing)
- alerts          (warnings, cyclone alerts, maritime advisories)
- geospatial      (boundaries, restricted zones, coastal areas)
- safety          (is it safe, danger, risk assessment)
- trip_planning   (plan a trip, route from A to B, navigate)
- fishing         (fishing conditions, fishing zones, best catch)
- general_marine  (broad/mixed marine queries)

Query: "${state.query}"

Respond with ONLY the single intent string, nothing else.`;

  const response = await groqModelRouter.invoke([new SystemMessage(prompt)], 'planning');
  const intent = normalizeIntent(response.response);
  console.log(`[Planner Agent] Intent: ${intent}`);
  console.log('[Planner Agent] Completed');

  return { intent, executedSteps: ['plannerAgent'] };
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
  const intent = state.intent ?? 'general_marine';

  let requiredAgents: string[];

  if (intent === 'conversational') {
    // Conversational — no data agents at all, just synthesis for a natural reply
    requiredAgents = ['synthesis'];

  } else if (intent === 'weather') {
    requiredAgents = ['weather', 'synthesis'];

  } else if (intent === 'ocean') {
    requiredAgents = ['ocean', 'synthesis'];

  } else if (intent === 'satellite') {
    requiredAgents = ['satellite', 'synthesis'];

  } else if (intent === 'alerts') {
    requiredAgents = ['alert', 'synthesis'];

  } else if (intent === 'geospatial') {
    requiredAgents = ['weather', 'geospatial', 'alert', 'synthesis'];

  } else if (intent === 'safety') {
    requiredAgents = ['weather', 'ocean', 'geospatial', 'alert', 'risk', 'synthesis'];

  } else if (intent === 'fishing') {
    requiredAgents = ['weather', 'ocean', 'satellite', 'geospatial', 'alert', 'risk', 'synthesis'];

  } else if (intent === 'trip_planning') {
    requiredAgents = ['weather', 'ocean', 'satellite', 'geospatial', 'alert', 'risk', 'synthesis'];

  } else {
    // general_marine — standard full set: weather + ocean + alerts but no satellite by default
    // unless the query explicitly asks for satellite/chlorophyll data
    const wantsSatellite = queryLower.includes('satellite') || queryLower.includes('chlorophyll') ||
      queryLower.includes('sst') || queryLower.includes('pfz');
    const wantsGeospatial = queryLower.includes('boundary') || queryLower.includes('restricted') ||
      queryLower.includes('zone') || queryLower.includes('geospatial');
    const wantsRisk = queryLower.includes('safe') || queryLower.includes('danger') ||
      queryLower.includes('risk');

    requiredAgents = [
      'weather',
      'ocean',
      ...(wantsSatellite ? ['satellite'] : []),
      ...(wantsGeospatial ? ['geospatial'] : []),
      'alert',
      ...(wantsRisk ? ['risk'] : []),
      'synthesis',
    ];
  }

  console.log(`[Agent Router] Required agents: ${requiredAgents.join(', ')}`);

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
  if (!isAgentRequired('weather', state)) {
    console.log('[Agent Router] Skipping non-required agent: weatherAgent');
    return {};
  }
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
  if (!isAgentRequired('ocean', state)) {
    console.log('[Agent Router] Skipping non-required agent: oceanAgent');
    return {};
  }
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
  if (!isAgentRequired('satellite', state)) {
    console.log('[Agent Router] Skipping non-required agent: satelliteAgent');
    return {};
  }
  const executedSet = getExecutedSet(state);
  if (executedSet.has('satelliteAgent')) {
    console.log('[Agent Router] Skipping duplicate agent: satelliteAgent');
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
  if (!isAgentRequired('geospatial', state)) {
    console.log('[Agent Router] Skipping non-required agent: geospatialAgent');
    return {};
  }
  const executedSet = getExecutedSet(state);
  if (executedSet.has('geospatialAgent')) {
    console.log('[Agent Router] Skipping duplicate agent: geospatialAgent');
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
    const [routeResult, boundaries] = await Promise.all([
      geoProv.analyseRoute(
        { lat: location.lat, lon: location.lon },
        { lat: location.lat, lon: location.lon },
        []
      ),
      geoProv.getNearbyBoundaries({ lat: location.lat, lon: location.lon }).catch(() => [])
    ]);

    const { data, status, error } = routeResult;
    console.log('[Geospatial Agent] Provider status:', status);
    console.log('[Geospatial Agent] Completed');
    const updated = markExecuted('geospatialAgent', executedSet);
    
    // Merge boundaries into geospatial data
    const geospatialData = data ? { ...data, nearbyBoundaries: boundaries } : { nearInternationalBoundary: false, nearRestrictedZone: false, nearbyBoundaries: boundaries };
    
    return {
      contextData: {
        geospatial: geospatialData,
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
  if (!isAgentRequired('alert', state)) {
    console.log('[Agent Router] Skipping non-required agent: alertAgent');
    return {};
  }
  const executedSet = getExecutedSet(state);
  if (executedSet.has('alertAgent')) {
    console.log('[Agent Router] Skipping duplicate agent: alertAgent');
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
  if (!isAgentRequired('risk', state)) {
    console.log('[Agent Router] Skipping non-required agent: riskAgent');
    return {};
  }
  const executedSet = getExecutedSet(state);
  if (executedSet.has('riskAgent')) {
    console.log('[Agent Router] Skipping duplicate agent: riskAgent');
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
    if (geospatial.nearbyBoundaries && geospatial.nearbyBoundaries.length > 0) {
      lines.push('Nearby Boundaries:');
      geospatial.nearbyBoundaries.forEach((b: any) => {
        lines.push(`- ${b.name} (${b.type.replace('_', ' ')}): ${b.distanceMeters > 1000 ? (b.distanceMeters/1000).toFixed(1) + ' km' : b.distanceMeters + ' m'} ${b.direction}. Status: ${b.status}`);
      });
    } else if (geospatial.nearbyBoundaries) {
      lines.push('Nearby Boundaries: None found within 50km.');
    }
  } else {
    lines.push(`Status: ${ctx.geospatialStatus ?? 'PROVIDER_UNAVAILABLE'}`);
    lines.push(ctx.geospatialError ?? 'Geospatial data unavailable.');
  }

  return lines.join('\n');
}

export const synthesisAgent = async (state: typeof OrcaState.State) => {
  if (state.finalResponse) {
    return { executedSteps: ['synthesisAgent'] };
  }

  console.log('[Agent Router] Executing: synthesisAgent');
  console.log('[Agent Router] Execution complete');

  const intent = state.intent ?? 'general_marine';

  // ── Conversational path — no marine data report ──────────────────────────────
  if (intent === 'conversational') {
    let roleInstructions = '';
    const userRole = state.userRole || 'general';
    if (userRole === 'fisherman') {
      roleInstructions = 'You are speaking to a FISHERMAN. Use simple language. Avoid unnecessary scientific terminology.';
    } else if (userRole === 'researcher') {
      roleInstructions = 'You are speaking to a RESEARCHER. Use scientific terminology when explaining capabilities.';
    } else if (userRole === 'coastal_guard') {
      roleInstructions = 'You are speaking to a COASTAL GUARD. Use concise operational language.';
    } else {
      roleInstructions = 'You are speaking to a GENERAL user. Use easy language.';
    }

    const conversationalPrompt = `You are ORCA, a professional marine intelligence assistant for Indian coastal waters.

ROLE INSTRUCTIONS:
${roleInstructions}

The user sent a conversational message: "${state.query}"

Respond naturally and briefly (2-4 sentences max). If it is a greeting, greet back warmly.
If they ask who you are or what you can do, give a concise overview of your capabilities:
- Real-time weather and ocean conditions
- Satellite SST and chlorophyll data
- Marine alerts and cyclone warnings
- Geospatial boundary and restricted zone info
- Safe fishing zone recommendations
- Trip planning and route safety assessments

Do NOT generate a marine conditions report. Do NOT include any data tables or weather/ocean values.
Keep the response friendly, short, and conversational.`;

    const response = await groqModelRouter.invoke([new SystemMessage(conversationalPrompt)], 'synthesis');
    return { finalResponse: response.response, executedSteps: ['synthesisAgent'] };
  }

  // ── Marine data synthesis path ───────────────────────────────────────────────
  const structuredContext = buildStructuredContext(state);
  const riskDump = state.riskAssessment
    ? `Level: ${state.riskAssessment.level}\nReasons:\n${(state.riskAssessment.reasoning ?? []).map((r: string) => '- ' + r).join('\n')}`
    : 'Risk assessment not performed for this query.';

  const locationName = state.contextData.location?.name || 'the requested location';

  let roleInstructions = '';
  const userRole = state.userRole || 'general';
  
  if (userRole === 'fisherman') {
    roleInstructions = 'You are speaking to a FISHERMAN. Use simple language. Avoid unnecessary scientific terminology. Do NOT give false safety guarantees.';
  } else if (userRole === 'researcher') {
    roleInstructions = 'You are speaking to a RESEARCHER. Use scientific terminology. Provide numerical values, units, relevant parameters, trends, comparisons, and scientific context. Do not oversimplify.';
  } else if (userRole === 'coastal_guard') {
    roleInstructions = 'You are speaking to a COASTAL GUARD. Use concise operational language. Prioritize severity, location, time, incident, and recommended operational attention.';
  } else {
    roleInstructions = 'You are speaking to a GENERAL user. Use easy language. Explain technical marine concepts when necessary.';
  }

  const prompt = `You are the ORCA Synthesis Agent. Provide a clear, professional, concise markdown response.

ROLE INSTRUCTIONS:
${roleInstructions}

STRICT RULES:
1. Use ONLY the data provided in the Structured Context below. Do NOT hallucinate or invent values.
2. NEVER use "-" as a placeholder. If a value is unavailable, write "Unavailable" or "No data available".
3. NEVER use a "Units / Notes" column in tables — only use "Parameter" and "Value" columns.
4. The value for each row must be the actual data value (e.g., "26.9 °C", "78%", "Unavailable").
5. Do NOT create empty rows or rows with only dashes.
6. Do NOT override or modify the Risk Assessment level — it is deterministic.
7. Use exact numbers from the context. Do not round or estimate differently.
8. Location to use: ${locationName}
9. Only include sections for data that was actually requested/fetched. If satellite data was not requested, do not include a Satellite section.

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
