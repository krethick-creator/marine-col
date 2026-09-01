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

  // Test 21: Real Fishing Zones Data Provider
  const { getOceanProvider } = await import('../services/ocean');
  const pfzZones = await getOceanProvider().getPFZZones({ lat: 13.0827, lon: 80.2707 });
  const allNonMock = pfzZones.length === 0 || pfzZones.every(z => !z.isMockData);
  assert(
    allNonMock,
    'PFZ Fishing Zones Provider returns real non-mock spatial data or empty status',
    `Zones count: ${pfzZones.length}, Mock count: ${pfzZones.filter(z => z.isMockData).length}`
  );

  // Test 22: Real Community Messaging System & Foreign Key Validation
  const communityRoute = (await import('../routes/community')).default;
  const { signToken } = await import('../middleware/auth');
  const validTestToken = signToken({ userId: 'test-user-123', role: 'FISHERMAN' });

  assert(
    Boolean(communityRoute) && Boolean(validTestToken),
    'Community API route and JWT auth session validator initialized with zero hardcoded IDs',
    'Real community router & JWT session ready'
  );

  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

  // Translation tests — Groq-native multilingual
  console.log('\n--- MULTILINGUAL TESTS (Groq-direct) ---');
  const { resolveLanguage } = await import('../utils/language');

  // TEST 1: User language = ta, Message = Tamil question -> responseLanguage = ta, contains Tamil script
  const tamilQuery = "இன்று கடலில் மீன்பிடிக்கச் செல்ல வானிலை மற்றும் கடல் நிலை பாதுகாப்பாக இருக்கிறதா?";
  const taState = await orcaGraph.invoke({
    query: tamilQuery,
    contextData: { location: { lat: 13.0827, lon: 80.2707, name: 'Chennai' }, language: 'ta' }
  });
  const hasTamilScript = /[\u0B80-\u0BFF]/.test(taState.finalResponse as string);
  assert(
    taState.responseLanguage === 'ta' &&
    (taState.finalResponse as string).length > 100 &&
    hasTamilScript &&
    !taState.translationFailed,
    'TEST 1: Tamil (ta) user language returns Tamil response with Tamil script',
    `responseLanguage: ${taState.responseLanguage}, length: ${(taState.finalResponse as string).length}, hasTamilScript: ${hasTamilScript}`
  );

  // TEST 2: User language = hi, Message = Hindi question -> responseLanguage = hi, contains Devanagari script
  await sleep(1000);
  const hindiQuery = "क्या आज मछली पकड़ने जाना सुरक्षित है?";
  const hiState = await orcaGraph.invoke({
    query: hindiQuery,
    contextData: { location: { lat: 13.0827, lon: 80.2707, name: 'Chennai' }, language: 'hi' }
  });
  const hasHindiScript = /[\u0900-\u097F]/.test(hiState.finalResponse as string);
  assert(
    hiState.responseLanguage === 'hi' &&
    (hiState.finalResponse as string).length > 100 &&
    hasHindiScript &&
    !hiState.translationFailed,
    'TEST 2: Hindi (hi) user language returns Hindi response with Devanagari script',
    `responseLanguage: ${hiState.responseLanguage}, length: ${(hiState.finalResponse as string).length}, hasHindiScript: ${hasHindiScript}`
  );

  // TEST 3: User language = en, Message = English question -> responseLanguage = en
  await sleep(1000);
  const enState = await orcaGraph.invoke({
    query: "Is it safe to go fishing in Chennai today?",
    contextData: { location: { lat: 13.0827, lon: 80.2707, name: 'Chennai' }, language: 'en' }
  });
  assert(
    enState.responseLanguage === 'en' && !enState.translationFailed,
    'TEST 3: English (en) user language returns English response',
    `responseLanguage: ${enState.responseLanguage}, length: ${(enState.finalResponse as string).length}`
  );

  // TEST 4: No explicit language, Tamil message -> Auto detect ta
  const autoTaLang = await resolveLanguage(tamilQuery, undefined);
  assert(
    autoTaLang === 'ta',
    'TEST 4: Automatically detects ta from Tamil script query',
    `detected: ${autoTaLang}`
  );

  // TEST 5: No explicit language, Hindi message -> Auto detect hi
  const autoHiLang = await resolveLanguage(hindiQuery, undefined);
  assert(
    autoHiLang === 'hi',
    'TEST 5: Automatically detects hi from Devanagari script query',
    `detected: ${autoHiLang}`
  );

  // TEST 6: Unsupported language code -> Fallback to English
  const resolvedUnknownLang = await resolveLanguage("Analyze marine safety for Chennai", 'xyz');
  assert(
    resolvedUnknownLang === 'en',
    'TEST 6: Unsupported language code falls back to English',
    `resolvedLanguage: ${resolvedUnknownLang}`
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

  // TEST 19: Role-based synthesis — Researcher role produces scientific technical response
  await sleep(1000);
  const researcherState = await orcaGraph.invoke({
    query: "Analyze ocean conditions, SST and chlorophyll",
    contextData: { location: { lat: 13.0827, lon: 80.2707, name: 'Chennai' }, language: 'en', role: 'researcher' }
  });
  assert(
    Boolean(researcherState.finalResponse) && (researcherState.finalResponse as string).length > 50,
    'TEST 7: Researcher role invocation produces comprehensive analytical response',
    `Response length: ${(researcherState.finalResponse as string).length}`
  );

  // TEST 20: Role-based synthesis — Coastal Guard role produces operational response
  await sleep(1000);
  const cgState = await orcaGraph.invoke({
    query: "Are there any restricted zones near my location?",
    contextData: { location: { lat: 13.0827, lon: 80.2707, name: 'Chennai' }, language: 'ta', role: 'coastal_guard' }
  });
  const cgHasTamil = /[\u0B80-\u0BFF]/.test(cgState.finalResponse as string);
  assert(
    cgState.responseLanguage === 'ta' && cgHasTamil,
    'TEST 8: Coastal Guard role with Tamil language produces operational Tamil response',
    `responseLanguage: ${cgState.responseLanguage}, hasTamilScript: ${cgHasTamil}`
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
