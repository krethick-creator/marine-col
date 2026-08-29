import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { getGeospatialProvider } from '../services/geospatial'

const router = Router()

const latLonSchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lon: z.coerce.number().min(-180).max(180),
})

router.get('/', async (req: Request, res: Response) => {
  const parsed = latLonSchema.safeParse(req.query)
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid or missing lat/lon' })
  }

  try {
    const provider = getGeospatialProvider()
    const [distanceToBoundaryNm, nearestFishingZoneKm] = await Promise.all([
      provider.distanceToBoundaryNm(parsed.data),
      provider.nearestFishingZoneKm(parsed.data),
    ])
    res.json({ dataSource: provider.dataSource, distanceToBoundaryNm, nearestFishingZoneKm })
  } catch (err) {
    console.error('Geospatial route error:', err)
    res.status(500).json({ error: 'Geospatial lookup failed' })
  }
})

export default router