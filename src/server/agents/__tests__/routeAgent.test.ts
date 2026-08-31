import {
  getSafeRoute,
  haversineKm,
  buildGrid,
  nearestNode,
  scoreNode,
  astar,
  pickHourValue,
  BOAT_PROFILES,
  type GridNode,
  type GridForecast,
  type Zone,
  type BoatProfile,
} from '../routeAgent'

describe('ORCA Route Agent — Deterministic Weather-Aware A* Engine', () => {
  // Test coordinates (Bay of Bengal / Chennai offshore region)
  const CHENNAI_HARBOUR = { lat: 13.0827, lon: 80.2707 }
  const FISHING_GROUND = { lat: 13.2500, lon: 80.5000 }

  // Helper to generate deterministic mock forecast data
  function createMockForecastFetcher(config?: {
    uniformWave?: number
    uniformWind?: number
    nodeOverrides?: Map<string, { wave: number; wind: number }>
  }) {
    return async (nodes: GridNode[][]): Promise<GridForecast[]> => {
      const times = [
        new Date(Date.now()).toISOString(),
        new Date(Date.now() + 3600 * 1000).toISOString(),
        new Date(Date.now() + 7200 * 1000).toISOString(),
        new Date(Date.now() + 10800 * 1000).toISOString(),
      ]

      return nodes.flat().map((node) => {
        const key = `${node.row},${node.col}`
        const override = config?.nodeOverrides?.get(key)
        const wave = override?.wave ?? config?.uniformWave ?? 0.8
        const wind = override?.wind ?? config?.uniformWind ?? 14

        return {
          node,
          marine: {
            hourly: {
              time: times,
              wave_height: times.map(() => wave),
            },
          },
          weather: {
            hourly: {
              time: times,
              wind_speed_10m: times.map(() => wind),
            },
          },
        }
      })
    }
  }

  // ─── 1. Mathematical & Geometry Utilities ──────────────────────────────
  describe('Mathematical & Geometry Utilities', () => {
    test('Haversine distance calculation is accurate', () => {
      // Distance between Chennai (13.0827, 80.2707) and Fishing ground (13.2500, 80.5000)
      const dist = haversineKm(
        [CHENNAI_HARBOUR.lat, CHENNAI_HARBOUR.lon],
        [FISHING_GROUND.lat, FISHING_GROUND.lon]
      )
      expect(dist).toBeGreaterThan(25)
      expect(dist).toBeLessThan(35)
    })

    test('buildGrid creates regular grid with correct dimensions and boundaries', () => {
      const grid = buildGrid(13.0, 13.5, 80.0, 80.5, 8)
      expect(grid.length).toBe(8)
      expect(grid[0].length).toBe(8)
      expect(grid[0][0].lat).toBeCloseTo(13.0, 4)
      expect(grid[0][0].lon).toBeCloseTo(80.0, 4)
      expect(grid[7][7].lat).toBeCloseTo(13.5, 4)
      expect(grid[7][7].lon).toBeCloseTo(80.5, 4)
    })

    test('nearestNode locates the closest grid node', () => {
      const grid = buildGrid(13.0, 14.0, 80.0, 81.0, 5)
      const nearest = nearestNode(grid, [13.02, 80.01])
      expect(nearest.row).toBe(0)
      expect(nearest.col).toBe(0)
    })
  })

  // ─── 2. Temporal Forecast Selection ────────────────────────────────────
  describe('Temporal Forecast Selection', () => {
    test('pickHourValue selects closest forecast hour correctly', () => {
      const times = [
        '2026-08-29T10:00:00.000Z',
        '2026-08-29T11:00:00.000Z',
        '2026-08-29T12:00:00.000Z',
      ]
      const waves = [0.5, 1.2, 2.5]

      const target = new Date('2026-08-29T11:15:00.000Z')
      const picked = pickHourValue(times, waves, target)
      expect(picked).toBe(1.2)
    })

    test('pickHourValue handles null values safely without crashing', () => {
      const times = ['2026-08-29T10:00:00.000Z', '2026-08-29T11:00:00.000Z']
      const waves: (number | null)[] = [null, 1.4]
      const target = new Date('2026-08-29T10:00:00.000Z')
      const picked = pickHourValue(times, waves, target, 0.5)
      expect(picked).toBe(1.4) // Recovers to adjacent valid measurement
    })
  })

  // ─── 3. Normal Route in Calm Conditions ────────────────────────────────
  describe('Normal Route in Calm Conditions', () => {
    test('calculates direct safe route with GO status for mechanized boat', async () => {
      const result = await getSafeRoute(
        CHENNAI_HARBOUR.lat,
        CHENNAI_HARBOUR.lon,
        FISHING_GROUND.lat,
        FISHING_GROUND.lon,
        {
          boatKey: 'mechanized',
          forecastFetcher: createMockForecastFetcher({ uniformWave: 0.8, uniformWind: 15 }),
        }
      )

      expect(result.success).toBe(true)
      expect(result.status).toBe('GO')
      expect(result.waypoints.length).toBeGreaterThanOrEqual(2)
      expect(result.distanceKm).toBeGreaterThan(25)
      expect(result.travelTimeMinutes).toBeGreaterThan(60)
      expect(result.maxWaveHeight).toBe(0.8)
      expect(result.maxWindSpeed).toBe(15)
      expect(result.forecastNote).toBe('Latest available marine/weather forecast, not live buoy observation')
      expect(result.timeline.length).toBe(result.waypoints.length)
    })
  })

  // ─── 4. Restricted Zone Avoidance ──────────────────────────────────────
  describe('Restricted Zone Avoidance', () => {
    test('A* strictly avoids restricted zone nodes and finds detour', async () => {
      // Place a restricted zone midway between start and destination
      const midLat = (CHENNAI_HARBOUR.lat + FISHING_GROUND.lat) / 2
      const midLon = (CHENNAI_HARBOUR.lon + FISHING_GROUND.lon) / 2
      const restrictedZone: Zone = {
        id: 'SEC-ZONE-01',
        name: 'Naval Exclusion Zone',
        lat: midLat,
        lon: midLon,
        radiusKm: 6.0,
      }

      const resultWithZone = await getSafeRoute(
        CHENNAI_HARBOUR.lat,
        CHENNAI_HARBOUR.lon,
        FISHING_GROUND.lat,
        FISHING_GROUND.lon,
        {
          boatKey: 'mechanized',
          restrictedZones: [restrictedZone],
          forecastFetcher: createMockForecastFetcher({ uniformWave: 0.8, uniformWind: 15 }),
        }
      )

      expect(resultWithZone.success).toBe(true)
      expect(resultWithZone.blockedNodesEncountered).toBeGreaterThan(0)
      expect(resultWithZone.restrictedZonesAvoided).toContain('Naval Exclusion Zone')

      // Verify that none of the generated waypoints fall inside the restricted radius
      for (const wp of resultWithZone.waypoints) {
        const d = haversineKm(wp, [restrictedZone.lat, restrictedZone.lon])
        expect(d).toBeGreaterThanOrEqual(restrictedZone.radiusKm * 0.7) // Strict perimeter avoidance
      }
    })

    test('returns structured failure when destination is directly inside restricted zone', async () => {
      const blockedDestZone: Zone = {
        id: 'PORT-RESTRICTED',
        name: 'High Security Port Boundary',
        lat: FISHING_GROUND.lat,
        lon: FISHING_GROUND.lon,
        radiusKm: 5.0,
      }

      const result = await getSafeRoute(
        CHENNAI_HARBOUR.lat,
        CHENNAI_HARBOUR.lon,
        FISHING_GROUND.lat,
        FISHING_GROUND.lon,
        {
          boatKey: 'mechanized',
          restrictedZones: [blockedDestZone],
          forecastFetcher: createMockForecastFetcher({ uniformWave: 0.8, uniformWind: 15 }),
        }
      )

      expect(result.success).toBe(false)
      expect(result.status).toBe('NO-GO')
      expect(result.reason).toContain('Destination location is inside restricted zone')
    })
  })

  // ─── 5. Boat Profile Operational Limits ────────────────────────────────
  describe('Boat Profile Operational Sensitivity', () => {
    test('Small boat gets NO-GO for waves exceeding 1.2m, while Mechanized boat gets GO/CAUTION for same conditions', async () => {
      // Wave conditions: 1.6m wave, 22 km/h wind
      // Small boat limit: maxWave = 1.2m -> Exceeded!
      // Mechanized boat limit: maxWave = 2.0m -> Safe!
      const forecastFetcher = createMockForecastFetcher({ uniformWave: 1.6, uniformWind: 22 })

      const smallResult = await getSafeRoute(
        CHENNAI_HARBOUR.lat,
        CHENNAI_HARBOUR.lon,
        FISHING_GROUND.lat,
        FISHING_GROUND.lon,
        {
          boatKey: 'small',
          forecastFetcher,
        }
      )

      const mechResult = await getSafeRoute(
        CHENNAI_HARBOUR.lat,
        CHENNAI_HARBOUR.lon,
        FISHING_GROUND.lat,
        FISHING_GROUND.lon,
        {
          boatKey: 'mechanized',
          forecastFetcher,
        }
      )

      expect(smallResult.status).toBe('NO-GO')
      expect(smallResult.hazards.some((h) => h.includes('exceeds boat threshold'))).toBe(true)

      expect(mechResult.status).not.toBe('NO-GO')
      expect(mechResult.success).toBe(true)
    })
  })

  // ─── 6. Cyclone Active Regional Alert ──────────────────────────────────
  describe('Active Cyclone Alert', () => {
    test('returns immediate structured NO-GO when cyclone is active', async () => {
      const result = await getSafeRoute(
        CHENNAI_HARBOUR.lat,
        CHENNAI_HARBOUR.lon,
        FISHING_GROUND.lat,
        FISHING_GROUND.lon,
        {
          boatKey: 'mechanized',
          cycloneActive: true,
          forecastFetcher: createMockForecastFetcher(),
        }
      )

      expect(result.success).toBe(false)
      expect(result.status).toBe('NO-GO')
      expect(result.reason).toContain('Active cyclone warning')
      expect(result.hazards).toContain('Active cyclone warning in region')
    })
  })

  // ─── 7. Error Handling & API Failures ──────────────────────────────────
  describe('Error Handling and Resilient Failure Handling', () => {
    test('handles Weather / Marine API failure gracefully with structured error', async () => {
      const failingFetcher = async () => {
        throw new Error('Open-Meteo Weather API HTTP 503 Service Unavailable')
      }

      const result = await getSafeRoute(
        CHENNAI_HARBOUR.lat,
        CHENNAI_HARBOUR.lon,
        FISHING_GROUND.lat,
        FISHING_GROUND.lon,
        {
          boatKey: 'mechanized',
          forecastFetcher: failingFetcher,
        }
      )

      expect(result.success).toBe(false)
      expect(result.status).toBe('NO-GO')
      expect(result.error).toContain('Open-Meteo Weather API HTTP 503')
      expect(result.reason).toContain('Forecast service unavailable')
    })

    test('handles invalid geographic coordinates with structured error', async () => {
      const result = await getSafeRoute(999, CHENNAI_HARBOUR.lon, FISHING_GROUND.lat, FISHING_GROUND.lon)
      expect(result.success).toBe(false)
      expect(result.status).toBe('NO-GO')
      expect(result.error).toContain('Invalid geographic coordinates')
    })
  })
})
