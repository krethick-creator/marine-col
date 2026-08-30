import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { config } from 'dotenv';
import * as schema from './schema';

config(); // Load environment variables from .env

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is missing');
}

// Initialize Drizzle ORM (if Postgres is running)
export let db: any;
export let pool: any;
try {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    // Add connection timeout so it doesn't hang forever
    connectionTimeoutMillis: 2000,
  });
  db = drizzle(pool, { schema });
  
  // Test connection
  pool.on('error', (err: any) => {
    console.error('Unexpected error on idle client', err);
  });
} catch (e) {
  console.log('PostgreSQL connection skipped/failed.');
}
