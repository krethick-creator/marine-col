import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import dotenv from 'dotenv'

import { chatRoutes } from './routes/chat'
import authRoutes from './routes/auth'
import alertsRoutes from './routes/alerts'
import boundariesRoutes from './routes/boundaries'
import communityRoutes from './routes/community'
import fishingRoutes from './routes/fishing'
import oceanRoutes from './routes/ocean'
import sosRoutes from './routes/sos'
import tripRoutes from './routes/trip'
import weatherRoutes from './routes/weather'

import { errorHandler } from './middleware/errorHandler'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3001

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
app.use('/api/ocean', oceanRoutes)
app.use('/api/sos', sosRoutes)
app.use('/api/trip', tripRoutes)
app.use('/api/weather', weatherRoutes)

app.use(errorHandler)

app.listen(PORT, () => {
  console.log(`[server]: ORCA Server is running at http://localhost:${PORT}`)
})
