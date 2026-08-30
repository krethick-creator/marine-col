import { OrcaState } from './OrcaState';
import { SystemMessage } from '@langchain/core/messages';
import { groqModelRouter } from '../llm/GroqModelRouter';

export const plannerAgent = async (state: typeof OrcaState.State) => {
  const prompt = `You are the ORCA Planner Agent. Analyze the user's query and determine the intent.
Possible intents: 'weather', 'fishing', 'trip_planning', 'safety', 'general'.
Query: "${state.query}"
Respond with ONLY the intent string.`;

  const response = await groqModelRouter.invoke([new SystemMessage(prompt)], 'planning');
  const intent = response.response.trim().toLowerCase();

  return {
    intent,
    executedSteps: ['plannerAgent']
  };
};

export const dataDiscoveryAgent = async (state: typeof OrcaState.State) => {
  // In a real scenario, this agent would determine exactly which API endpoints to call.
  // For now, we pass the baton to the specific data agents based on intent.
  return {
    executedSteps: ['dataDiscoveryAgent']
  };
};

import { getWeatherProvider } from '../services/weather';
import { getOceanProvider } from '../services/ocean';

export const weatherAgent = async (state: typeof OrcaState.State) => {
  let location = state.contextData?.location;

  // Task 9: Derive location name from query coordinates or text
  if (location && typeof location.lat === 'number' && typeof location.lon === 'number') {
    const queryLower = state.query.toLowerCase();
    let name = location.locationName || location.name || 'Chennai';
    let lat = location.lat;
    let lon = location.lon;

    if (queryLower.includes('puducherry') || queryLower.includes('pondicherry')) {
      lat = 11.9416;
      lon = 79.8083;
      name = 'Puducherry';
    } else if (queryLower.includes('chennai') || queryLower.includes('madras')) {
      lat = 13.0827;
      lon = 80.2707;
      name = 'Chennai';
    } else {
      // Direct coordinate checks to map to canonical names
      const latDiff = Math.abs(location.lat - 13.0827);
      const lonDiff = Math.abs(location.lon - 80.2707);
      if (latDiff < 0.1 && lonDiff < 0.1) {
        name = 'Chennai';
      }
    }
    location = { ...location, lat, lon, name };
  }

  if (!location || typeof location.lat !== 'number' || typeof location.lon !== 'number') {
    // If no coordinates provided, request them
    return {
      finalResponse: "I need your location coordinates (latitude and longitude) to provide a weather and safety analysis. Please provide them or allow location access.",
      executedSteps: ['weatherAgent']
    };
  }

  const provider = getWeatherProvider();

  try {
    const weatherData = await provider.getCurrentConditions({ lat: location.lat, lon: location.lon });
    // Guarantee correct location name inside the weatherData returned to the prompt context
    weatherData.location = location.name || `${location.lat.toFixed(2)}, ${location.lon.toFixed(2)}`;
    return {
      contextData: {
        location,
        weather: weatherData
      },
      executedSteps: ['weatherAgent']
    };
  } catch (error) {
    console.error('[Weather Agent] Failed to fetch weather:', error);
    // Continue gracefully so Risk Engine knows weather is missing
    return {
      contextData: { weather: null },
      executedSteps: ['weatherAgent']
    };
  }
};

export const oceanAgent = async (state: typeof OrcaState.State) => {
  const location = state.contextData?.location;

  if (!location || typeof location.lat !== 'number' || typeof location.lon !== 'number') {
    console.warn('[Ocean Agent] No valid location coordinates in state context.');
    return {
      contextData: { ocean: null },
      executedSteps: ['oceanAgent']
    };
  }

  const provider = getOceanProvider();

  try {
    const oceanSnapshot = await provider.getSnapshot({ lat: location.lat, lon: location.lon });
    return {
      contextData: { ocean: oceanSnapshot },
      executedSteps: ['oceanAgent']
    };
  } catch (error) {
    console.error('[Ocean Agent] Error fetching ocean snapshot:', error);
    return {
      contextData: { ocean: null },
      executedSteps: ['oceanAgent']
    };
  }
};

export const satelliteAgent = async (state: typeof OrcaState.State) => {
  return {
    executedSteps: ['satelliteAgent']
  };
};

import { getGeospatialProvider } from '../services/geospatial';

export const geospatialAgent = async (state: typeof OrcaState.State) => {
  const location = state.contextData?.location;

  // If no location, skip geospatial analysis
  if (!location || typeof location.lat !== 'number' || typeof location.lon !== 'number') {
    console.warn('[Geospatial Agent] No valid location coordinates in state context.');
    return {
      contextData: { geospatial: null },
      executedSteps: ['geospatialAgent']
    };
  }

  const provider = getGeospatialProvider();

  try {
    // Get geospatial data for current location
    const [distanceToBoundaryNm, nearestFishingZoneKm] = await Promise.all([
      provider.distanceToBoundaryNm({ lat: location.lat, lon: location.lon }),
      provider.nearestFishingZoneKm({ lat: location.lat, lon: location.lon }),
    ]);

    // For trip planning scenarios, also analyse the route if we have destination
    let routeAnalysis = null;
    if (state.intent === 'trip_planning' && state.contextData?.destination) {
      const dest = state.contextData.destination;
      if (typeof dest.lat === 'number' && typeof dest.lon === 'number') {
        routeAnalysis = await provider.analyseRoute(
          { lat: location.lat, lon: location.lon },
          { lat: dest.lat, lon: dest.lon }
        );
      }
    }

    const geoData = {
      distanceToBoundaryNm,
      nearestFishingZoneKm,
      routeAnalysis,
      dataSource: provider.dataSource,
      isMockData: provider.isMock,
    };

    return {
      contextData: { geospatial: geoData },
      executedSteps: ['geospatialAgent']
    };
  } catch (error) {
    console.error('[Geospatial Agent] Error fetching geospatial data:', error);
    return {
      contextData: { geospatial: null },
      executedSteps: ['geospatialAgent']
    };
  }
};

export const alertAgent = async (state: typeof OrcaState.State) => {
  const activeAlerts: any[] = []; // Mocking no active cyclone alerts
  return {
    contextData: { alerts: activeAlerts },
    executedSteps: ['alertAgent']
  };
};

export const riskAgent = async (state: typeof OrcaState.State) => {
  // Deterministic Risk Engine evaluation (NOT an LLM call)
  const { weather, ocean, geospatial, alerts } = state.contextData;
  let status = 'GO';
  let reasons: string[] = [];

  const effectiveWaveHeight = ocean?.waveHeight ?? weather?.waveHeight ?? null;
  const effectiveSeaState = ocean?.seaState ?? weather?.seaState ?? null;
  const effectiveWindSpeed = weather?.windSpeed ?? null;

  const isGoodPFZ = ocean?.pfzScore && ocean.pfzScore > 0.7;
  const isHighWaves = effectiveWaveHeight !== null && effectiveWaveHeight > 2.5;
  const hasCycloneAlert = alerts && alerts.length > 0;

  // Use actual geospatial data - check distance to boundary
  const distanceToBoundaryNm = geospatial?.distanceToBoundaryNm ?? null;
  const isNearBoundary = distanceToBoundaryNm !== null && distanceToBoundaryNm < 60;
  const isVeryNearBoundary = distanceToBoundaryNm !== null && distanceToBoundaryNm < 10;

  // Check for restricted zones on route (if route analysis is available)
  const routeIntersectsRestricted = geospatial?.routeAnalysis?.routeIntersectsRestricted ?? false;

  const isWorseningAfternoon = weather?.morningWind < 15 && weather?.afternoonWind > 25;
  const hasDangerousReturn = weather?.returnConditionsDangerous === true;

  // Rule 1: Good PFZ + high waves -> NO_GO
  if (isGoodPFZ && isHighWaves) {
    status = 'NO_GO';
    reasons.push('High wave conditions at target PFZ. Unsafe to operate despite good fish potential.');
  }

  // Rule 1a: Route intersects restricted zones -> NO_GO
  if (routeIntersectsRestricted) {
    status = 'NO_GO';
    reasons.push('Planned route intersects restricted maritime zones. Navigation prohibited.');
  }

  // Rule 2: Good PFZ + cyclone alert -> NO_GO
  if (isGoodPFZ && hasCycloneAlert) {
    status = 'NO_GO';
    reasons.push('Active cyclone advisory supersedes good PFZ conditions.');
  }

  // Rule 5: Attractive fishing zone + dangerous return conditions -> do not recommend the zone
  if (isGoodPFZ && hasDangerousReturn && status !== 'NO_GO') {
    status = 'NO_GO';
    reasons.push('Return trip conditions are dangerous. Zone is not recommended.');
  }

  // Rule 3: Very near international boundary -> NO_GO
  if (isVeryNearBoundary && status !== 'NO_GO') {
    status = 'NO_GO';
    reasons.push(`Critical: Only ${distanceToBoundaryNm}nm from international maritime boundary. Do not proceed — risk of international waters violation.`);
  }

  // Rule 3b: Good PFZ + near international boundary -> CAUTION
  if (isGoodPFZ && isNearBoundary && !isVeryNearBoundary && status !== 'NO_GO') {
    status = 'CAUTION';
    reasons.push(`Proximity to international boundary (${distanceToBoundaryNm}nm). Suggest planning a safer alternative route with greater boundary clearance.`);
  }

  // Rule 3c: Trip not good PFZ but near boundary -> CAUTION  
  if (!isGoodPFZ && isNearBoundary && status !== 'NO_GO') {
    status = 'CAUTION';
    reasons.push(`Operating near international maritime boundary (${distanceToBoundaryNm}nm). Exercise heightened caution and maintain course within territorial waters.`);
  }

  // Rule 4: Good morning conditions + worsening afternoon weather -> GO early + recommend return before unsafe conditions
  if (isWorseningAfternoon && status !== 'NO_GO') {
    status = 'CAUTION';
    reasons.push('Weather will worsen in the afternoon. GO early and return before conditions become unsafe.');
  }

  // Basic fallback safety checks
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

  if (status === 'GO') {
    reasons.push('All safety parameters are within normal limits.');
    // Add positive geospatial notes
    if (isNearBoundary) {
      reasons.push(`Note: Operating near international boundary (${distanceToBoundaryNm}nm) - maintain course within territorial waters.`);
    }
    if (geospatial?.nearestFishingZoneKm) {
      reasons.push(`Nearest fishing zone: ${geospatial.nearestFishingZoneKm}km away.`);
    }
  }

  return {
    riskAssessment: {
      status,
      reasoning: reasons,
      evidence: {
        windSpeed: effectiveWindSpeed,
        waveHeight: effectiveWaveHeight,
        swellPeriod: ocean?.swellPeriod ?? weather?.swellPeriod ?? null,
        seaState: effectiveSeaState,
        waveDirection: ocean?.waveDirection ?? null,
        currentSpeed: ocean?.currentSpeed ?? null
      }
    },
    executedSteps: ['riskAgent']
  };
};

export const routeAgent = async (state: typeof OrcaState.State) => {
  if (state.intent !== 'trip_planning') {
    return { executedSteps: ['routeAgent'] };
  }
  return {
    routePlan: { waypoints: 3, estimatedDuration: '3 days' },
    executedSteps: ['routeAgent']
  };
};

export const synthesisAgent = async (state: typeof OrcaState.State) => {
  if (state.finalResponse) {
    // If a previous agent (like weatherAgent) already supplied a final response (e.g. missing coordinates),
    // short-circuit the synthesis.
    return {
      executedSteps: ['synthesisAgent']
    };
  }

  const contextDump = JSON.stringify(state.contextData, null, 2);
  const riskDump = JSON.stringify(state.riskAssessment, null, 2);

  const prompt = `You are the ORCA Synthesis Agent. Your job is to provide a final response to the fisherman or marine operator.
Do NOT hallucinate data. Use the provided context and risk assessment.
IMPORTANT: You MUST use the exact location name, latitude, and longitude provided in the Context Data. Do not invent or change the location name.
Location Name to use: ${state.contextData.location?.name || 'Chennai'}
Latitude: ${state.contextData.location?.lat}
Longitude: ${state.contextData.location?.lon}

- All wind speeds are strictly in km/h. Do not manufacture, convert, or invent other units.
- Weather and sea state values must match the Context Data exactly.

Risk Assessment (DETERMINISTIC - DO NOT OVERRIDE THIS LEVEL):
${riskDump}

Context Data:
${contextDump}

User Query: "${state.query}"

Provide a professional, concise, clear markdown response summarizing the situation and advising the user based on the deterministic risk assessment.`;

  const response = await groqModelRouter.invoke([new SystemMessage(prompt)], 'synthesis');

  return {
    finalResponse: response.response,
    executedSteps: ['synthesisAgent']
  };
};
