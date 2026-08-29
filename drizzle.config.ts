import { defineConfig } from 'drizzle-kit';
import * as dotenv from 'dotenv';

dotenv.config();

export default defineConfig({
  schema: './src/server/db/schema.ts',
  out: './src/server/db/migrations',
  dialect: 'postgresql',

  extensionsFilters: ['postgis'],

 tablesFilter: [
  'users',
  'trips',
  'routes',
  'fishing_zones',
  'boundaries',
  'restricted_zones',
  'marine_protected_areas',
  'alerts',
  'community_posts',
  'emergency_events',
  'weather_observations',
  'ocean_observations',
  '!playing_with_neon',
],
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});