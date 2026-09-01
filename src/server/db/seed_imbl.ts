import { Pool } from 'pg'
import dotenv from 'dotenv'
dotenv.config()

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

// Authoritative treaty coordinates of 1974 & 1976 India-Sri Lanka Maritime Boundary Agreements
// All coordinates are strictly [longitude, latitude] in degrees (SRID 4326)
const imblCoordinates: [number, number][] = [
  [77.0233, 4.7840],  // Point T (Maldives-India-Sri Lanka trijunction)
  [77.1767, 5.0000],  // Position 13m
  [77.8450, 5.8983],  // Position 12m
  [78.2033, 6.5133],  // Position 11m
  [78.6467, 7.3500],  // Position 10m
  [78.7617, 7.5883],  // Position 9m
  [78.8950, 8.2033],  // Position 8m
  [78.9233, 8.3700],  // Position 7m
  [79.0783, 8.5200],  // Position 6m
  [79.2167, 8.6200],  // Position 5m
  [79.3033, 8.6667],  // Position 4m
  [79.4883, 8.8967],  // Position 3m
  [79.5217, 9.0000],  // Position 2m
  [79.5333, 9.1000],  // Position 1m / Position 6 (1974)
  [79.5333, 9.2167],  // Position 5 (1974)
  [79.5117, 9.3633],  // Position 4 (1974)
  [79.3767, 9.6692],  // Position 3 (1974 - West of Kachchatheevu)
  [79.5833, 9.9500],  // Position 2 (1974)
  [80.0500, 10.0833], // Position 1 (1974) / Position 1b (1976)
  [80.0833, 10.0967], // Position 1ba (1976)
  [80.5000, 10.2500], // Position 2b (1976)
  [81.0000, 10.6667], // Position 3b (1976)
  [81.5833, 11.1667], // Position 4b (1976)
  [82.1667, 11.7500], // Position 5b (1976)
  [82.8333, 12.3333]  // Position 6b (1976)
]

const geojsonStr = JSON.stringify({
  type: 'LineString',
  coordinates: imblCoordinates
})

export async function seedIMBL() {
  try {
    await pool.query('DELETE FROM boundaries')
    const res = await pool.query(
      'INSERT INTO boundaries (name, type, geometry) VALUES ($1, $2, ST_SetSRID(ST_GeomFromGeoJSON($3), 4326)) RETURNING id, name, type, ST_AsGeoJSON(geometry) AS geojson',
      ['India-Sri Lanka IMBL (1974 & 1976 Agreements)', 'international', geojsonStr]
    )
    console.log('SUCCESS: Inserted official IMBL treaty boundary into PostGIS DB!')
    console.log('Inserted ID:', res.rows[0].id)
    console.log('Name:', res.rows[0].name)
    console.log('GeoJSON snippet:', res.rows[0].geojson.slice(0, 120) + '...')
  } catch (err: any) {
    console.error('ERROR seeding IMBL:', err.message)
  } finally {
    await pool.end()
  }
}

export default seedIMBL

