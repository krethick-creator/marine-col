import { pgTable, serial, text, timestamp, boolean, doublePrecision, integer, jsonb, geometry } from 'drizzle-orm/pg-core';

// ─── Users ─────────────────────────────────────────────────────────────
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  password: text('password').notNull(),
  name: text('name').notNull(),
  role: text('role').notNull().default('general'),
  language: text('language').notNull().default('en'),
  // Store a default/home location as PostGIS point
  location: geometry('location', { type: 'point', mode: 'xy', srid: 4326 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ─── Trips ─────────────────────────────────────────────────────────────
export const trips = pgTable('trips', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  title: text('title').notNull(),
  status: text('status').notNull().default('planned'), // planned, active, completed, cancelled
  departureTime: timestamp('departure_time').notNull(),
  returnTime: timestamp('return_time').notNull(),
  boatDetails: jsonb('boat_details'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ─── Routes ────────────────────────────────────────────────────────────
export const routes = pgTable('routes', {
  id: serial('id').primaryKey(),
  tripId: integer('trip_id').references(() => trips.id).notNull(),
  // A PostGIS LineString representing the planned route
  geometry: geometry('geometry', { type: 'linestring', mode: 'xy', srid: 4326 }),
  waypoints: jsonb('waypoints'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ─── Fishing Zones (PFZ) ───────────────────────────────────────────────
export const fishingZones = pgTable('fishing_zones', {
  id: serial('id').primaryKey(),
  name: text('name'),
  // A PostGIS Polygon representing the fishing zone area
  geometry: geometry('geometry', { type: 'polygon', mode: 'xy', srid: 4326 }).notNull(),
  suitabilityScore: doublePrecision('suitability_score').notNull(), // 0.0 to 1.0
  sst: doublePrecision('sst'), // Sea Surface Temp
  chlorophyll: doublePrecision('chlorophyll'),
  validUntil: timestamp('valid_until'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ─── Boundaries ────────────────────────────────────────────────────────
export const boundaries = pgTable('boundaries', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  type: text('type').notNull(), // e.g., 'international', 'state'
  // A PostGIS LineString or Polygon representing the boundary
  geometry: geometry('geometry', { type: 'linestring', mode: 'xy', srid: 4326 }).notNull(),
});

// ─── Restricted Zones ──────────────────────────────────────────────────
export const restrictedZones = pgTable('restricted_zones', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  type: text('type').notNull(), // e.g., 'military', 'hazard'
  geometry: geometry('geometry', { type: 'polygon', mode: 'xy', srid: 4326 }).notNull(),
});

// ─── Marine Protected Areas ────────────────────────────────────────────
export const marineProtectedAreas = pgTable('marine_protected_areas', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  geometry: geometry('geometry', { type: 'polygon', mode: 'xy', srid: 4326 }).notNull(),
});

// ─── Alerts ────────────────────────────────────────────────────────────
export const alerts = pgTable('alerts', {
  id: serial('id').primaryKey(),
  type: text('type').notNull(), // cyclone, high_wave, strong_wind
  severity: text('severity').notNull(), // low, medium, high, critical
  title: text('title').notNull(),
  description: text('description'),
  geometry: geometry('geometry', { type: 'polygon', mode: 'xy', srid: 4326 }),
  validFrom: timestamp('valid_from').notNull(),
  validUntil: timestamp('valid_until').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ─── Community Posts ───────────────────────────────────────────────────
export const communityPosts = pgTable('community_posts', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  content: text('content').notNull(),
  type: text('type').notNull().default('general'), // general, catch_report, hazard_warning
  location: geometry('location', { type: 'point', mode: 'xy', srid: 4326 }),
  reactions: jsonb('reactions'),
  isOfficial: boolean('is_official').default(false), // Distinguish official warnings
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ─── Emergency Events (SOS) ────────────────────────────────────────────
export const emergencyEvents = pgTable('emergency_events', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  tripId: integer('trip_id').references(() => trips.id),
  location: geometry('location', { type: 'point', mode: 'xy', srid: 4326 }).notNull(),
  status: text('status').notNull().default('active'), // active, resolved
  log: jsonb('log'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ─── Weather Observations (Cache) ──────────────────────────────────────
export const weatherObservations = pgTable('weather_observations', {
  id: serial('id').primaryKey(),
  location: geometry('location', { type: 'point', mode: 'xy', srid: 4326 }).notNull(),
  forecast: jsonb('forecast').notNull(),
  freshnessMetadata: jsonb('freshness_metadata'),
  recordedAt: timestamp('recorded_at').defaultNow().notNull(),
});

// ─── Ocean Observations (Cache) ────────────────────────────────────────
export const oceanObservations = pgTable('ocean_observations', {
  id: serial('id').primaryKey(),
  location: geometry('location', { type: 'point', mode: 'xy', srid: 4326 }).notNull(),
  sst: doublePrecision('sst'),
  waveHeight: doublePrecision('wave_height'),
  chlorophyll: doublePrecision('chlorophyll'),
  recordedAt: timestamp('recorded_at').defaultNow().notNull(),
});
