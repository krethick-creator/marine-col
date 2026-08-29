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

export const weatherAgent = async (state: typeof OrcaState.State) => {
  const location = state.contextData?.location;

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
    return { 
      contextData: { weather: weatherData },
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
  // Mocking ocean/PFZ data fetching.
  const oceanData = { sst: 28.5, chlorophyll: 1.2, pfzScore: 0.85 };
  return { 
    contextData: { ocean: oceanData },
    executedSteps: ['oceanAgent'] 
  };
};

export const satelliteAgent = async (state: typeof OrcaState.State) => {
  return { 
    executedSteps: ['satelliteAgent'] 
  };
};

export const geospatialAgent = async (state: typeof OrcaState.State) => {
  const geoData = { nearInternationalBoundary: false, nearRestrictedZone: false };
  return { 
    contextData: { geospatial: geoData },
    executedSteps: ['geospatialAgent'] 
  };
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

  const isGoodPFZ = ocean?.pfzScore && ocean.pfzScore > 0.7;
  const isHighWaves = weather?.waveHeight && weather.waveHeight > 2.5;
  const hasCycloneAlert = alerts && alerts.length > 0;
  const isNearBoundary = geospatial?.nearInternationalBoundary === true;
  const isWorseningAfternoon = weather?.morningWind < 15 && weather?.afternoonWind > 25;
  const hasDangerousReturn = weather?.returnConditionsDangerous === true;

  // Rule 1: Good PFZ + high waves -> NO-GO
  if (isGoodPFZ && isHighWaves) {
    status = 'NO-GO';
    reasons.push('High wave conditions at target PFZ. Unsafe to operate despite good fish potential.');
  }

  // Rule 2: Good PFZ + cyclone alert -> NO-GO
  if (isGoodPFZ && hasCycloneAlert) {
    status = 'NO-GO';
    reasons.push('Active cyclone advisory supersedes good PFZ conditions.');
  }

  // Rule 5: Attractive fishing zone + dangerous return conditions -> do not recommend the zone
  if (isGoodPFZ && hasDangerousReturn && status !== 'NO-GO') {
    status = 'NO-GO';
    reasons.push('Return trip conditions are dangerous. Zone is not recommended.');
  }

  // Rule 3: Good PFZ + route near international boundary -> suggest safer alternative route
  if (isGoodPFZ && isNearBoundary && status !== 'NO-GO') {
    status = 'CAUTION';
    reasons.push('Proximity to international boundary. Suggest planning a safer alternative route.');
  }

  // Rule 4: Good morning conditions + worsening afternoon weather -> GO early + recommend return before unsafe conditions
  if (isWorseningAfternoon && status !== 'NO-GO') {
    status = 'CAUTION';
    reasons.push('Weather will worsen in the afternoon. GO early and return before conditions become unsafe.');
  }

  // Basic fallback safety checks
  if (status !== 'NO-GO') {
    if (!weather || weather.waveHeight === null || weather.seaState === 'UNKNOWN') {
      status = 'NO-GO';
      reasons.push('Critical marine safety data (wave height) is unavailable. Cannot safely recommend GO without marine data.');
    } else if (weather.windSpeed > 30 || weather.waveHeight > 2.5) {
      status = 'NO-GO';
      reasons.push('Dangerous general wind or wave conditions.');
    } else if (weather.windSpeed > 20 || weather.waveHeight > 1.5) {
      status = 'CAUTION';
      reasons.push('Moderate wind/waves, exercise caution.');
    }
  }

  if (status === 'GO') {
    reasons.push('All safety parameters are within normal limits.');
  }

  return { 
    riskAssessment: { level: status, reasons },
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
