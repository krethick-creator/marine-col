// src/server/services/geospatial/PostGISGeospatialProvider.ts
// ------------------------------------------------
// Real implementation of GeospatialProvider, querying PostGIS tables
// (fishing_zones, restricted_zones, marine_protected_areas, boundaries)
// via the schema already defined in src/server/db/schema.ts.

import { Pool } from "pg";
import type { GeospatialProvider } from "./GeospatialProvider";
import type { GeospatialSnapshot, LatLon, ProviderResult } from "../../types";

let _pool: Pool | null = null;
function getPool(): Pool {
  if (!_pool) {
    _pool = new Pool({ connectionString: process.env.DATABASE_URL });
  }
  return _pool;
}

export class PostGISGeospatialProvider implements GeospatialProvider {
  readonly isMock = false;
  readonly dataSource = "PostGIS (live)";

  async analyseRoute(
    origin: LatLon,
    destination: LatLon,
    waypoints: LatLon[] = []
  ): Promise<ProviderResult<GeospatialSnapshot>> {
    try {
      const routePoints = [origin, ...waypoints, destination]
        .map((p) => `${p.lon} ${p.lat}`)
        .join(', ');
      const routeLineString = `LINESTRING(${routePoints})`;

      const intersectsQuery = `
        SELECT name, type FROM restricted_zones
        WHERE ST_Intersects(geometry, ST_GeomFromText($1, 4326))
        UNION ALL
        SELECT name, 'MPA' AS type FROM marine_protected_areas
        WHERE ST_Intersects(geometry, ST_GeomFromText($1, 4326))
      `;

      const nearestBoundaryQuery = `
        SELECT
          ST_Distance(
            geometry::geography,
            ST_GeomFromText($1, 4326)::geography
          ) * 0.000539957 AS distance_nm
        FROM boundaries
        ORDER BY geometry <-> ST_GeomFromText($1, 4326)
        LIMIT 1
      `;

      const [intersectResult, boundaryResult] = await Promise.all([
        getPool().query(intersectsQuery, [routeLineString]),
        getPool().query(nearestBoundaryQuery, [routeLineString]),
      ]);

      const restrictedZonesOnRoute = intersectResult.rows.map((r) => r.name as string);
      const distanceToBoundaryNm = boundaryResult.rows[0]
        ? parseFloat(boundaryResult.rows[0].distance_nm.toFixed(1))
        : 999;

      const routeNearBoundary = distanceToBoundaryNm < 60;
      const veryNearBoundary = distanceToBoundaryNm < 10;

      const snapshot: GeospatialSnapshot = {
        routeIntersectsRestricted: restrictedZonesOnRoute.length > 0,
        routeNearBoundary,
        distanceToBoundaryNm,
        restrictedZonesOnRoute,
        alternativeRouteAvailable: routeNearBoundary && !veryNearBoundary,
        isMockData: false,
        dataSource: this.dataSource,
        issuedAt: new Date(),
        providerStatus: 'REAL_DATA_SUCCESS',
      };
      const result: ProviderResult<GeospatialSnapshot> = { data: snapshot, status: 'REAL_DATA_SUCCESS' };
      return result;
    } catch (err) {
      console.warn('[Geospatial] analyseRoute provider error:', err);
      const result: ProviderResult<GeospatialSnapshot> = { status: 'PROVIDER_UNAVAILABLE' };
      return result;
    }
  }

  async distanceToBoundaryNm(location: LatLon): Promise<number> {
    const query = `
      SELECT
        ST_Distance(
          geometry::geography,
          ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography
        ) * 0.000539957 AS distance_nm
      FROM boundaries
      ORDER BY geometry <-> ST_SetSRID(ST_MakePoint($1, $2), 4326)
      LIMIT 1
    `;
    const { rows } = await getPool().query(query, [location.lon, location.lat]);
    return rows[0] ? parseFloat(rows[0].distance_nm.toFixed(1)) : 999;
  }

  async nearestFishingZoneKm(location: LatLon): Promise<number> {
    const query = `
      SELECT
        ST_Distance(
          geometry::geography,
          ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography
        ) / 1000.0 AS distance_km
      FROM fishing_zones
      WHERE valid_until IS NULL OR valid_until > NOW()
      ORDER BY geometry <-> ST_SetSRID(ST_MakePoint($1, $2), 4326)
      LIMIT 1
    `;
    const { rows } = await getPool().query(query, [location.lon, location.lat]);
    return rows[0] ? parseFloat(rows[0].distance_km.toFixed(1)) : -1;
  }

  async getNearbyBoundaries(location: LatLon): Promise<any> {
    const query = `
      WITH user_loc AS (
        SELECT ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography AS geog,
               ST_SetSRID(ST_MakePoint($1, $2), 4326) AS geom
      ),
      all_features AS (
        SELECT id::text, name, type, geometry FROM boundaries
        UNION ALL
        SELECT id::text, name, type, geometry FROM restricted_zones
        UNION ALL
        SELECT id::text, name, 'protected_area' AS type, geometry FROM marine_protected_areas
      )
      SELECT 
        f.id, f.name, f.type,
        ST_Distance(f.geometry::geography, u.geog) AS distance_meters,
        degrees(ST_Azimuth(u.geom, ST_ClosestPoint(f.geometry, u.geom))) AS azimuth,
        ST_Contains(f.geometry, u.geom) OR ST_Intersects(f.geometry, u.geom) AS inside,
        ST_AsGeoJSON(f.geometry) AS geojson
      FROM all_features f, user_loc u
      WHERE ST_DWithin(f.geometry::geography, u.geog, 500000)
      ORDER BY distance_meters ASC
      LIMIT 20;
    `;
    const { rows } = await getPool().query(query, [location.lon, location.lat]);

    const boundaries = rows.map(r => {
      const distanceMeters = r.distance_meters;
      const inside = r.inside;
      let status = 'SAFE';
      if (inside) status = 'INSIDE RESTRICTED AREA';
      else if (distanceMeters < 1000) status = 'HIGH CAUTION';
      else if (distanceMeters < 5000) status = 'CAUTION';
      else if (distanceMeters <= 10000) status = 'NEARBY';

      let direction = 'N/A';
      if (r.azimuth !== null) {
        const val = Math.floor((r.azimuth / 22.5) + 0.5);
        const arr = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
        direction = arr[(val % 16)];
      }

      return {
        id: r.id,
        name: r.name,
        type: r.type,
        status,
        distanceMeters: Math.round(distanceMeters),
        direction,
        inside,
        source: 'PostGIS (live)',
        geometry: JSON.parse(r.geojson)
      };
    });

    return boundaries;
  }
}
