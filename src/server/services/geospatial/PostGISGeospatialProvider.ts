// src/server/services/geospatial/PostGISGeospatialProvider.ts
// ------------------------------------------------
// Real implementation of GeospatialProvider, querying PostGIS tables
// (fishing_zones, restricted_zones, marine_protected_areas, boundaries)
// via the schema already defined in src/server/db/schema.ts.

import { Pool } from "pg";
import type { GeospatialProvider } from "./GeospatialProvider";
import type { GeospatialSnapshot, LatLon } from "../../types";

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
  ): Promise<GeospatialSnapshot> {
    const routePoints = [origin, ...waypoints, destination]
      .map((p) => `${p.lon} ${p.lat}`)
      .join(", ");
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

    return {
      routeIntersectsRestricted: restrictedZonesOnRoute.length > 0,
      routeNearBoundary,
      distanceToBoundaryNm,
      restrictedZonesOnRoute,
      alternativeRouteAvailable: routeNearBoundary && !veryNearBoundary,
      isMockData: false,
    };
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
}