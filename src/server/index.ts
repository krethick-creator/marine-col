import dotenv from 'dotenv'
dotenv.config()

import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'

import { chatRoutes } from './routes/chat'
import authRoutes from './routes/auth'
import alertsRoutes from './routes/alerts'
import boundariesRoutes from './routes/boundaries'
import communityRoutes from './routes/community'
import fishingRoutes from './routes/fishing'
import geospatialRoutes from './routes/geospatial'
import oceanRoutes from './routes/ocean'
import sosRoutes from './routes/sos'
import tripRoutes from './routes/trip'
import weatherRoutes from './routes/weather'

import { errorHandler } from './middleware/errorHandler'

const app = express()
const PORT = parseInt(process.env.PORT || '4000', 10)

app.use(cors())
app.use(helmet())
app.use(morgan('dev'))
app.use(express.json())

app.use('/api/chat', chatRoutes)
app.use('/api/auth', authRoutes)
app.use('/api/alerts', alertsRoutes)
app.use('/api/boundaries', boundariesRoutes)
app.use('/api/community', communityRoutes)
app.use('/api/fishing', fishingRoutes)
app.use('/api/geospatial', geospatialRoutes)
app.use('/api/ocean', oceanRoutes)
app.use('/api/sos', sosRoutes)
app.use('/api/trip', tripRoutes)
app.use('/api/weather', weatherRoutes)

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'ORCA backend' })
})

app.use(errorHandler)

process.on('uncaughtException', (err) => {
  console.error('[server] Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[server] Unhandled Rejection at:', promise, 'reason:', reason);
});

import { groqModelRouter } from './llm/GroqModelRouter'

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`[server]: ORCA Server is running at http://localhost:${PORT}`)
  groqModelRouter.printStatus()
})

server.on('error', (err) => {
  console.error('[server] Server error:', err);
});
