import { useEffect, useState } from 'react'
import { CloudSun, Info, Compass, Thermometer, Wind, AlertCircle } from 'lucide-react'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts'
import { useAppStore } from '../../store'

interface MonthlyClimatology {
  monthName: string
  avgMaxTemp: number
  avgMinTemp: number
  totalPrecipitation: number
  avgWindSpeed: number
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

export default function ClimatePage() {
  const { user } = useAppStore()
  const [climatology, setClimatology] = useState<MonthlyClimatology[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Statistical summaries
  const [stats, setStats] = useState<{
    hottestMonth: string
    wettestMonth: string
    windiestMonth: string
    annualRainfall: number
  } | null>(null)

  useEffect(() => {
    if (!user?.location?.lat || !user?.location?.lon) return

    setLoading(true)
    setError(null)

    // Query 2025 Archive data for exact coordinates
    const lat = user.location.lat
    const lon = user.location.lon
    const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&start_date=2025-01-01&end_date=2025-12-31&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max&timezone=auto`

    fetch(url)
      .then(res => {
        if (!res.ok) throw new Error('Historical archive failed')
        return res.json()
      })
      .then(json => {
        const daily = json.daily || {}
        const times: string[] = daily.time || []
        const maxTemps: number[] = daily.temperature_2m_max || []
        const minTemps: number[] = daily.temperature_2m_min || []
        const precipitation: number[] = daily.precipitation_sum || []
        const windSpeeds: number[] = daily.wind_speed_10m_max || []

        // Group into monthly buckets
        const buckets = Array.from({ length: 12 }, () => ({
          maxTemps: [] as number[],
          minTemps: [] as number[],
          precipitation: [] as number[],
          windSpeeds: [] as number[]
        }))

        for (let i = 0; i < times.length; i++) {
          const date = new Date(times[i])
          const month = date.getMonth() // 0-11
          if (maxTemps[i] !== null && maxTemps[i] !== undefined) buckets[month].maxTemps.push(maxTemps[i])
          if (minTemps[i] !== null && minTemps[i] !== undefined) buckets[month].minTemps.push(minTemps[i])
          if (precipitation[i] !== null && precipitation[i] !== undefined) buckets[month].precipitation.push(precipitation[i])
          if (windSpeeds[i] !== null && windSpeeds[i] !== undefined) buckets[month].windSpeeds.push(windSpeeds[i])
        }

        // Aggregate averages
        const monthlyData: MonthlyClimatology[] = buckets.map((bucket, idx) => {
          const avgMax = bucket.maxTemps.length > 0 ? bucket.maxTemps.reduce((a, b) => a + b, 0) / bucket.maxTemps.length : 0
          const avgMin = bucket.minTemps.length > 0 ? bucket.minTemps.reduce((a, b) => a + b, 0) / bucket.minTemps.length : 0
          const totalPrecip = bucket.precipitation.reduce((a, b) => a + b, 0)
          const avgWind = bucket.windSpeeds.length > 0 ? bucket.windSpeeds.reduce((a, b) => a + b, 0) / bucket.windSpeeds.length : 0

          return {
            monthName: MONTH_NAMES[idx],
            avgMaxTemp: parseFloat(avgMax.toFixed(1)),
            avgMinTemp: parseFloat(avgMin.toFixed(1)),
            totalPrecipitation: parseFloat(totalPrecip.toFixed(1)),
            avgWindSpeed: parseFloat(avgWind.toFixed(1))
          }
        })

        setClimatology(monthlyData)

        // Compute statistics
        let hottestIdx = 0, wettestIdx = 0, windiestIdx = 0
        let maxT = -999, maxP = -999, maxW = -999
        let totalRain = 0

        monthlyData.forEach((m, idx) => {
          totalRain += m.totalPrecipitation
          if (m.avgMaxTemp > maxT) { maxT = m.avgMaxTemp; hottestIdx = idx }
          if (m.totalPrecipitation > maxP) { maxP = m.totalPrecipitation; wettestIdx = idx }
          if (m.avgWindSpeed > maxW) { maxW = m.avgWindSpeed; windiestIdx = idx }
        })

        setStats({
          hottestMonth: MONTH_NAMES[hottestIdx],
          wettestMonth: MONTH_NAMES[wettestIdx],
          windiestMonth: MONTH_NAMES[windiestIdx],
          annualRainfall: parseFloat(totalRain.toFixed(1))
        })
        setLoading(false)
      })
      .catch(err => {
        console.error(err)
        setError('Failed to fetch historical archive data for this location. Reconnect online or select another location.')
        setLoading(false)
      })
  }, [user?.location?.lat, user?.location?.lon])

  return (
    <div className="page-shell">
      <div className="page-header">
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Compass size={24} color="var(--accent-blue)" /> Climate Patterns
          </h1>
          <p className="page-subtitle">Long-term seasonal climatology and historical cycles for {user?.locationName || 'your region'}</p>
        </div>
      </div>

      {/* Weather vs Climate explanatory Banner */}
      <div className="glass-card" style={{ padding: 18, marginBottom: 24, display: 'flex', gap: 12, borderLeft: '3px solid var(--accent-blue)', alignItems: 'center' }}>
        <Info size={20} color="var(--accent-blue)" style={{ flexShrink: 0 }} />
        <div style={{ fontSize: 13, lineHeight: 1.5, color: 'var(--text-light)' }}>
          <strong>Climatology Notice:</strong> Weather represents short-term changes in the atmosphere (e.g. today's rain, tomorrow's storm). 
          <strong> Climate</strong> represents the long-term averages and patterns observed over years. The seasonal graphs below reflect real aggregated historical values for this specific coordinates from the past year.
        </div>
      </div>

      {loading ? (
        <div className="glass-card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Analyzing historical climatology data...</div>
      ) : error ? (
        <div className="glass-card" style={{ padding: 24, background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.2)', color: 'var(--status-nogo)', display: 'flex', gap: 10, alignItems: 'center' }}>
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      ) : (
        <>
          {/* Key Insights Cards */}
          {stats && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
              <div className="glass" style={{ padding: 16, borderRadius: 12 }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Hottest Month</div>
                <div style={{ fontSize: 18, fontWeight: 700, marginTop: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Thermometer size={16} color="#ef4444" /> {stats.hottestMonth}
                </div>
              </div>
              <div className="glass" style={{ padding: 16, borderRadius: 12 }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Wettest Month</div>
                <div style={{ fontSize: 18, fontWeight: 700, marginTop: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <CloudSun size={16} color="#3b82f6" /> {stats.wettestMonth}
                </div>
              </div>
              <div className="glass" style={{ padding: 16, borderRadius: 12 }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Windiest Month</div>
                <div style={{ fontSize: 18, fontWeight: 700, marginTop: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Wind size={16} color="#10b981" /> {stats.windiestMonth}
                </div>
              </div>
              <div className="glass" style={{ padding: 16, borderRadius: 12 }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Total Annual Rainfall</div>
                <div style={{ fontSize: 18, fontWeight: 700, marginTop: 6 }}>
                  💧 {stats.annualRainfall} mm
                </div>
              </div>
            </div>
          )}

          {/* Climate Charts */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: 20 }}>
            
            {/* Seasonal Temperature Cycles */}
            <div className="glass-card" style={{ padding: 20 }}>
              <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Thermometer size={16} color="var(--accent-blue)" /> Seasonal Temperature Cycles (2025)
              </h3>
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={climatology}>
                  <defs>
                    <linearGradient id="maxTempGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0.0}/>
                    </linearGradient>
                    <linearGradient id="minTempGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="monthName" stroke="var(--text-muted)" fontSize={10} tickLine={false} />
                  <YAxis stroke="var(--text-muted)" fontSize={10} unit="°C" domain={['auto', 'auto']} tickLine={false} />
                  <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }} />
                  <Legend verticalAlign="top" height={36} />
                  <Area type="monotone" dataKey="avgMaxTemp" name="Avg Max Temp" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#maxTempGrad)" />
                  <Area type="monotone" dataKey="avgMinTemp" name="Avg Min Temp" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#minTempGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Monthly Precipitation (Rainfall) */}
            <div className="glass-card" style={{ padding: 20 }}>
              <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                💧 Monthly Precipitation (Rainfall) Cycles
              </h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={climatology}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="monthName" stroke="var(--text-muted)" fontSize={10} tickLine={false} />
                  <YAxis stroke="var(--text-muted)" fontSize={10} unit="mm" tickLine={false} />
                  <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }} />
                  <Bar dataKey="totalPrecipitation" name="Rainfall" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Wind Climatological Averages */}
            <div className="glass-card" style={{ padding: 20, gridColumn: 'span 2' }}>
              <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Wind size={16} color="var(--accent-blue)" /> Wind Climatological Seasonal Cycle
              </h3>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={climatology}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="monthName" stroke="var(--text-muted)" fontSize={10} tickLine={false} />
                  <YAxis stroke="var(--text-muted)" fontSize={10} unit=" km/h" domain={[0, 'auto']} tickLine={false} />
                  <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }} />
                  <Line type="monotone" dataKey="avgWindSpeed" name="Average Peak Wind" stroke="#10b981" strokeWidth={2.5} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>

          </div>
        </>
      )}
    </div>
  )
}
