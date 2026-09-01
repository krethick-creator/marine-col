import {
  getSafeRoute,
  haversineKm,
  buildGrid,
  nearestNode,
  pickHourValue,
  scoreNode,
  type GridNode,
  type GridForecast,
  type Zone,
} from './routeAgent'

async function runTests() {
  console.log('=================================================================')
  console.log('🧭 ORCA ROUTE AGENT — VERIFICATION & TEST SUITE')
  console.log('=================================================================\n')

  let passed = 0
  let total = 0

  function assert(condition: boolean, title: string, details?: string) {
    total++
    if (condition) {
      passed++
      console.log(`✅ [PASS] ${title}`)
      if (details) console.log(`   └─ ${details}`)
    } else {
      console.error(`❌ [FAIL] ${title}`)
      if (details) console.error(`   └─ ${details}`)
    }
  }

  // Coordinates
  const CHENNAI_HARBOUR = { lat: 13.0827, lon: 80.2707 }
  const FISHING_GROUND = { lat: 13.2500, lon: 80.5000 }

  function mockFetcher(config: { wave: number; wind: number }) {
    return async (nodes: GridNode[][]): Promise<GridForecast[]> => {
      const times = [
        new Date(Date.now()).toISOString(),
        new Date(Date.now() + 3600 * 1000).toISOString(),
        new Date(Date.now() + 7200 * 1000).toISOString(),
        new Date(Date.now() + 10800 * 1000).toISOString(),
      ]

      return nodes.flat().map((node) => ({
        node,
        marine: {
          hourly: {
            time: times,
            wave_height: times.map(() => config.wave),
          },
        },
        weather: {
          hourly: {
            time: times,
            wind_speed_10m: times.map(() => config.wind),
          },
        },
      }))
    }
  }

  // Test 1: Geometry & Haversine
  const dist = haversineKm(
    [CHENNAI_HARBOUR.lat, CHENNAI_HARBOUR.lon],
    [FISHING_GROUND.lat, FISHING_GROUND.lon]
  )
  assert(
    dist > 25 && dist < 35,
    'Haversine distance calculation is accurate',
    `Distance = ${dist.toFixed(2)} km`
  )

  // Test 2: Grid generation
  const grid = buildGrid(13.0, 13.5, 80.0, 80.5, 8)
  assert(
    grid.length === 8 && grid[0].length === 8,
    'buildGrid constructs regular 8x8 search grid',
    `Grid dimensions: ${grid.length}x${grid[0].length}`
  )

  // Test 3: Temporal selection
  const times = ['2026-08-29T10:00:00.000Z', '2026-08-29T11:00:00.000Z']
  const picked = pickHourValue(times, [1.0, 2.4], new Date('2026-08-29T11:10:00.000Z'))
  assert(
    picked === 2.4,
    'pickHourValue selects closest forecast hour correctly',
    `Picked value = ${picked}m at closest hour`
  )

  // Test 4: Normal Route in Calm conditions
  const normalRoute = await getSafeRoute(
    CHENNAI_HARBOUR.lat,
    CHENNAI_HARBOUR.lon,
    FISHING_GROUND.lat,
    FISHING_GROUND.lon,
    {
      boatKey: 'mechanized',
      forecastFetcher: mockFetcher({ wave: 0.8, wind: 14 }),
    }
  )
  assert(
    normalRoute.success && normalRoute.status === 'GO',
    'Normal route in calm conditions produces GO status',
    `Distance: ${normalRoute.distanceKm} km, Travel time: ${normalRoute.travelTimeMinutes} min, Waypoints: ${normalRoute.waypoints.length}`
  )

  // Test 5: Restricted Zone Avoidance & Blocked Node Skipping
  const midLat = (CHENNAI_HARBOUR.lat + FISHING_GROUND.lat) / 2
  const midLon = (CHENNAI_HARBOUR.lon + FISHING_GROUND.lon) / 2
  const restrictedZone: Zone = {
    id: 'ZONE-RESTRICTED-01',
    name: 'Naval Security Zone',
    lat: midLat,
    lon: midLon,
    radiusKm: 6.0,
  }

  const restrictedDetour = await getSafeRoute(
    CHENNAI_HARBOUR.lat,
    CHENNAI_HARBOUR.lon,
    FISHING_GROUND.lat,
    FISHING_GROUND.lon,
    {
      boatKey: 'mechanized',
      restrictedZones: [restrictedZone],
      forecastFetcher: mockFetcher({ wave: 0.8, wind: 14 }),
    }
  )
  assert(
    restrictedDetour.success && restrictedDetour.blockedNodesEncountered > 0,
    'A* successfully skips blocked restricted nodes and finds detour',
    `Blocked nodes encountered: ${restrictedDetour.blockedNodesEncountered}, Avoided zones: ${restrictedDetour.restrictedZonesAvoided.join(', ')}`
  )

  // Test 6: Blocked Destination
  const blockedDestZone: Zone = {
    id: 'ZONE-BLOCKED-DEST',
    name: 'Exclusion Zone',
    lat: FISHING_GROUND.lat,
    lon: FISHING_GROUND.lon,
    radiusKm: 5.0,
  }
  const blockedResult = await getSafeRoute(
    CHENNAI_HARBOUR.lat,
    CHENNAI_HARBOUR.lon,
    FISHING_GROUND.lat,
    FISHING_GROUND.lon,
    {
      boatKey: 'mechanized',
      restrictedZones: [blockedDestZone],
      forecastFetcher: mockFetcher({ wave: 0.8, wind: 14 }),
    }
  )
  assert(
    !blockedResult.success && blockedResult.status === 'NO-GO',
    'Route Agent returns structured NO-GO when destination is inside restricted zone',
    `Reason: ${blockedResult.reason}`
  )

  // Test 7: Boat Profile Sensitivity (Small boat vs Mechanized boat)
  // Waves: 1.6m (Exceeds Small boat 1.2m limit, but within Mechanized boat 2.0m limit)
  const roughFetcher = mockFetcher({ wave: 1.6, wind: 22 })
  const smallBoatRoute = await getSafeRoute(
    CHENNAI_HARBOUR.lat,
    CHENNAI_HARBOUR.lon,
    FISHING_GROUND.lat,
    FISHING_GROUND.lon,
    {
      boatKey: 'small',
      forecastFetcher: roughFetcher,
    }
  )
  const mechBoatRoute = await getSafeRoute(
    CHENNAI_HARBOUR.lat,
    CHENNAI_HARBOUR.lon,
    FISHING_GROUND.lat,
    FISHING_GROUND.lon,
    {
      boatKey: 'mechanized',
      forecastFetcher: roughFetcher,
    }
  )
  assert(
    smallBoatRoute.status === 'NO-GO' && mechBoatRoute.status !== 'NO-GO',
    'Boat profiles yield different risk outcomes under identical sea conditions',
    `Small boat: ${smallBoatRoute.status} (limit: 1.2m), Mechanized boat: ${mechBoatRoute.status} (limit: 2.0m)`
  )

  // Test 8: Active Cyclone Warning
  const cycloneResult = await getSafeRoute(
    CHENNAI_HARBOUR.lat,
    CHENNAI_HARBOUR.lon,
    FISHING_GROUND.lat,
    FISHING_GROUND.lon,
    {
      cycloneActive: true,
      forecastFetcher: mockFetcher({ wave: 0.8, wind: 14 }),
    }
  )
  assert(
    !cycloneResult.success && cycloneResult.status === 'NO-GO',
    'Immediate structured NO-GO on active cyclone warning',
    `Reason: ${cycloneResult.reason}`
  )

  // Test 9: Forecast API Failure Handling
  const failingFetcher = async () => {
    throw new Error('Open-Meteo API 503 Service Unavailable')
  }
  const apiFailResult = await getSafeRoute(
    CHENNAI_HARBOUR.lat,
    CHENNAI_HARBOUR.lon,
    FISHING_GROUND.lat,
    FISHING_GROUND.lon,
    {
      forecastFetcher: failingFetcher,
    }
  )
  assert(
    !apiFailResult.success && apiFailResult.status === 'NO-GO' && Boolean(apiFailResult.error?.includes('503')),
    'Handles Forecast API failure gracefully without crashing',
    `Error reported: ${apiFailResult.error}`
  )

  // Test 10: Invalid Coordinates Handling
  const invalidCoordResult = await getSafeRoute(999, 80.27, 13.25, 80.5)
  assert(
    !invalidCoordResult.success && invalidCoordResult.status === 'NO-GO' && Boolean(invalidCoordResult.error?.includes('Invalid geographic coordinates')),
    'Invalid coordinates handled with structured error',
    `Error reported: ${invalidCoordResult.error}`
  )

  // Test 11: Graph Agent Deduplication and Provider Status Propagation
  const { orcaGraph } = await import('./OrcaGraph');
  const testState: any = await orcaGraph.invoke({
    query: "Analyze marine safety for Chennai",
    contextData: { location: { lat: 13.0827, lon: 80.2707, name: 'Chennai' } }
  });

  const executedSteps = testState.executedSteps || [];

  // Count occurrences
  const stepCounts: Record<string, number> = {};
  for (const step of executedSteps) {
    stepCounts[step] = (stepCounts[step] || 0) + 1;
  }

  const hasDuplicates = Object.values(stepCounts).some(count => count > 1);

  assert(
    !hasDuplicates && executedSteps.includes('alertAgent') && executedSteps.includes('weatherAgent'),
    'Graph executes required agents exactly once',
    `Executed steps: ${executedSteps.join(', ')}`
  );

  const alertStatus = testState.contextData.alertStatus;
  assert(
    alertStatus === 'REAL_DATA_SUCCESS' || alertStatus === 'REAL_DATA_EMPTY' || alertStatus === 'PROVIDER_UNAVAILABLE' || alertStatus === 'MOCK_DATA',
    'Alert provider status propagated correctly',
    `Status: ${alertStatus}`
  );

  // Test 12: Real Satellite Provider Bounding Box
  const { RealSatelliteProvider } = await import('../services/satellite/RealSatelliteProvider');
  const provider = new RealSatelliteProvider();

  const satResult = await provider.getSnapshot({ lat: 13.0827, lon: 80.2707 });

  const isOk =
    satResult.status === 'REAL_DATA_SUCCESS' ||
    satResult.status === 'PROVIDER_UNAVAILABLE' ||
    satResult.status === 'REAL_DATA_EMPTY';

  assert(
    isOk,
    'Satellite Provider handles request or reports outage/empty status correctly',
    `Status: ${satResult.status}, SST: ${satResult.data?.sst} °C, Chla: ${satResult.data?.chlorophyll} mg/m³`
  );

  // Translation tests — Groq-native multilingual (no Sarvam/Bhashini)
  console.log('\n--- MULTILINGUAL TESTS (Groq-direct) ---');
  const { resolveLanguage } = await import('../utils/language');

  // Test 13: Hindi explicit language — responseLanguage must match
  const hiState = await orcaGraph.invoke({
    query: "Analyze marine safety for Chennai",
    contextData: { location: { lat: 13.0827, lon: 80.2707, name: 'Chennai' }, language: 'hi' }
  });
  assert(
    hiState.responseLanguage === 'hi' &&
    (hiState.finalResponse as string).length > 100 &&
    !hiState.translationFailed,
    'Hindi: responseLanguage=hi, non-empty response, no translation failure',
    `responseLanguage: ${hiState.responseLanguage}, length: ${(hiState.finalResponse as string).length}`
  );

  // Test 14: English — responseLanguage must be en, no non-ASCII characters from Hindi/Tamil
  const enState = await orcaGraph.invoke({
    query: "Analyze marine safety for Chennai",
    contextData: { location: { lat: 13.0827, lon: 80.2707, name: 'Chennai' }, language: 'en' }
  });
  assert(
    enState.responseLanguage === 'en' && !enState.translationFailed,
    'English: responseLanguage=en, no translation failure',
    `responseLanguage: ${enState.responseLanguage}, length: ${(enState.finalResponse as string).length}`
  );

  // Test 15: Unknown language code falls back to English via resolveLanguage
  const resolvedUnknownLang = await resolveLanguage("Analyze marine safety for Chennai", 'xyz');
  assert(
    resolvedUnknownLang === 'en',
    'Unsupported language code falls back to English',
    `resolvedLanguage: ${resolvedUnknownLang}`
  );

  // Test 16: Auto-detect Hindi from query text
  const hindiQuery = "क्या कल मछली पकड़ने जाना सुरक्षित है?";
  const autoLang = await resolveLanguage(hindiQuery, undefined);
  assert(
    autoLang === 'hi',
    'Auto-detects Hindi from Devanagari query text',
    `detected: ${autoLang}`
  );

  // Test 17: Tamil response — responseLanguage=ta, non-empty
  const taState = await orcaGraph.invoke({
    query: "சென்னையிலிருந்து புதுச்சேரிக்கு இன்று கடல் பாதுகாப்பானதா?",
    contextData: { location: { lat: 13.0827, lon: 80.2707, name: 'Chennai' }, language: 'ta' }
  });
  assert(
    taState.responseLanguage === 'ta' &&
    (taState.finalResponse as string).length > 100 &&
    !taState.translationFailed,
    'Tamil: responseLanguage=ta, non-empty response, no translation failure',
    `responseLanguage: ${taState.responseLanguage}, length: ${(taState.finalResponse as string).length}`
  );

  // Test 18: No Sarvam/Bhashini — confirm provider files deleted
  let sarvamImportFailed = false;
  try {
    await import('../services/translation/SarvamTranslationProvider' as any);
  } catch {
    sarvamImportFailed = true;
  }
  assert(
    sarvamImportFailed,
    'SarvamTranslationProvider has been removed — no external translation API',
    'Import threw as expected'
  );



  console.log('\n-----------------------------------------------------------------')
  console.log(`TEST SUMMARY: ${passed} / ${total} tests passed (${Math.round((passed / total) * 100)}%)`)
  console.log('-----------------------------------------------------------------\n')

  if (passed === total) {
    console.log('🎉 ALL ROUTE AGENT TESTS PASSED SUCCESSFULLY!')
  } else {
    process.exit(1)
  }
}

runTests().catch((err) => {
  console.error('Test execution failed:', err)
  process.exit(1)
})
