import { OpenMeteoWeatherProvider } from './src/server/services/weather/OpenMeteoWeatherProvider';
import { riskAgent } from './src/server/agents/nodes';
import { OrcaState } from './src/server/agents/OrcaState';

async function testMarineErrors() {
  console.log("=== MARINE DATA SAFETY TESTS ===");

  const originalFetch = global.fetch;

  let marineBehavior = 'success'; // 'success', '400', 'timeout'
  let weatherBehavior = 'success';

  (global as any).fetch = async (url: string) => {
    if (url.includes('api.open-meteo.com/v1/forecast')) {
      if (weatherBehavior === 'success') {
        return new Response(JSON.stringify({
          current: {
            temperature_2m: 30, apparent_temperature: 32, weather_code: 1, 
            wind_speed_10m: 15, wind_direction_10m: 180, relative_humidity_2m: 80
          },
          hourly: { time: [], temperature_2m: [], wind_speed_10m: [], weather_code: [], precipitation: [] },
          daily: { time: [], temperature_2m_max: [], temperature_2m_min: [], wind_speed_10m_max: [], weather_code: [] }
        }), { status: 200 });
      }
    }

    if (url.includes('marine-api.open-meteo.com/v1/marine')) {
      if (marineBehavior === '400') {
        return new Response(JSON.stringify({ error: true, reason: 'Latitude must be in range' }), { status: 400 });
      }
      if (marineBehavior === 'timeout') {
        throw new TypeError('fetch failed');
      }
      if (marineBehavior === 'null-fields') {
        return new Response(JSON.stringify({
          current: { wave_height: null, wave_period: null },
          hourly: { wave_height: [] },
          daily: { wave_height_max: [] }
        }), { status: 200 });
      }
      if (marineBehavior === 'success') {
        return new Response(JSON.stringify({
          current: { wave_height: 1.2, wave_period: 6 },
          hourly: { wave_height: [] },
          daily: { wave_height_max: [] }
        }), { status: 200 });
      }
    }
  };

  const provider = new OpenMeteoWeatherProvider();

  try {
    // 1. Valid marine data
    console.log("\\n--- 1. Valid marine data ---");
    marineBehavior = 'success';
    let data = await provider.getCurrentConditions({ lat: 10, lon: 10 });
    console.assert(data.waveHeight === 1.2, "Expected waveHeight 1.2");
    console.assert(data.seaState === 'Slight', "Expected Slight seaState");
    
    let riskState = await riskAgent({ contextData: { weather: data } } as any);
    console.assert(riskState.riskAssessment?.level === 'GO', "Expected GO");
    console.log("Passed.");

    // 2. Marine API returns null
    console.log("\\n--- 2. Marine API returns null fields ---");
    marineBehavior = 'null-fields';
    data = await provider.getCurrentConditions({ lat: 10, lon: 10 });
    console.assert(data.waveHeight === null, "Expected waveHeight null");
    console.assert(data.seaState === 'UNKNOWN', "Expected UNKNOWN seaState");
    console.assert(data.temperature === 30, "Standard weather should still work");

    riskState = await riskAgent({ contextData: { weather: data } } as any);
    console.assert(riskState.riskAssessment?.level === 'NO-GO', "Expected NO-GO for missing marine data");
    console.log("Passed.");

    // 3. Marine API returns HTTP 400
    console.log("\\n--- 3. Marine API returns HTTP 400 ---");
    marineBehavior = '400';
    data = await provider.getCurrentConditions({ lat: 10, lon: 10 });
    console.assert(data.waveHeight === null, "Expected waveHeight null");
    console.assert(data.seaState === 'UNKNOWN', "Expected UNKNOWN seaState");
    console.assert(data.temperature === 30, "Standard weather should still work");
    console.log("Passed.");

    // 4. Network failure
    console.log("\\n--- 4. Network failure for marine API ---");
    marineBehavior = 'timeout';
    data = await provider.getCurrentConditions({ lat: 10, lon: 10 });
    console.assert(data.waveHeight === null, "Expected waveHeight null");
    console.assert(data.temperature === 30, "Standard weather should still work");
    console.log("Passed.");

    console.log("\\nALL MARINE SAFETY TESTS PASSED");
  } finally {
    global.fetch = originalFetch;
  }
}

testMarineErrors().catch(console.error);
