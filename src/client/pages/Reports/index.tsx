import { useEffect, useState } from 'react'
import { Calendar, BarChart2, TrendingUp, AlertTriangle, CloudRain, Wind, Waves, Thermometer } from 'lucide-react'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts'
import { useAppStore } from '../../store'
import { useTranslation } from '../../locales'
import { getWeatherHistory } from '../../services/api/weatherService'
import type { HistoricalDataPoint } from '../../types'
import DataStatusBadge from '../../components/ui/DataStatusBadge'

export default function ReportsPage() {
  const { t } = useTranslation()
  const { user, offlineMode } = useAppStore()
  const [period, setPeriod] = useState<'today' | '7days' | '30days' | 'custom'>('7days')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [historyData, setHistoryData] = useState<HistoricalDataPoint[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user?.location?.lat || !user?.location?.lon) return

    let days = 7
    if (period === 'today') days = 1
    if (period === '30days') days = 30
    if (period === 'custom' && startDate && endDate) {
      const start = new Date(startDate)
      const end = new Date(endDate)
      const diffTime = Math.abs(end.getTime() - start.getTime())
      days = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)))
    } else if (period === 'custom') {
      return // Wait for both dates
    }

    setLoading(true)
    setError(null)
    getWeatherHistory(user.location.lat, user.location.lon, days)
      .then((data) => {
        setHistoryData(data)
        setLoading(false)
      })
      .catch((err) => {
        console.error(err)
        setError('Failed to load historical reports. The weather provider might be temporarily offline.')
        setLoading(false)
      })
  }, [user?.location?.lat, user?.location?.lon, period, startDate, endDate])

  // Custom tooltips/formatters
  const formatTime = (timeStr: string) => {
    const d = new Date(timeStr)
    if (period === 'today') {
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
    return d.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit' })
  }

  // Helper to check if a specific key has any valid non-null values in the array
  const hasData = (key: keyof HistoricalDataPoint) => {
    return historyData.some(d => d[key] !== null && d[key] !== undefined)
  }

  // Calculate Risk Level (GO = 1, CAUTION = 2, NO-GO = 3)
  const chartData = historyData.map(d => {
    let riskScore = 1 // GO
    if ((d.windSpeed && d.windSpeed > 25) || (d.waveHeight && d.waveHeight > 2.0)) {
      riskScore = 3 // NO-GO
    } else if ((d.windSpeed && d.windSpeed > 18) || (d.waveHeight && d.waveHeight > 1.2)) {
      riskScore = 2 // CAUTION
    }

    return {
      ...d,
      formattedTime: formatTime(d.time),
      riskScore
    }
  })

  const renderNoData = (title: string) => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 220, background: 'rgba(255,255,255,0.01)', border: '1px dashed rgba(255,255,255,0.05)', borderRadius: 12, padding: 20 }}>
      <AlertTriangle size={24} color="var(--text-muted)" style={{ marginBottom: 8 }} />
      <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{t('reports.noRealData')} ({title})</span>
    </div>
  )

  return (
    <div className="page-shell">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <BarChart2 size={24} color="var(--accent-blue)" /> {t('reports.title')}
            {offlineMode && (
              <div style={{ marginLeft: 8 }}>
                <DataStatusBadge isCached={true} fetchedAt={historyData.length > 0 ? (historyData[0] as any).fetchedAt : undefined} />
              </div>
            )}
          </h1>
          <p className="page-subtitle">{t('reports.subtitle')} {user?.locationName || 'your region'}</p>
        </div>

        {/* Time Filters */}
        <div className="glass" style={{ padding: '6px 12px', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {(['today', '7days', '30days', 'custom'] as const).map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              style={{
                padding: '6px 12px',
                borderRadius: 8,
                background: period === p ? 'var(--accent-blue)' : 'transparent',
                color: period === p ? 'white' : 'var(--text-light)',
                border: 'none',
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: 600,
                textTransform: 'capitalize'
              }}
            >
              {p === 'today' ? t('reports.today') : p === '7days' ? t('reports.last7days') : p === '30days' ? t('reports.last30days') : t('reports.custom')}
            </button>
          ))}
        </div>
      </div>

      {/* Custom Date Picker inputs */}
      {period === 'custom' && (
        <div className="glass-card" style={{ display: 'flex', gap: 16, padding: 16, borderRadius: 12, marginBottom: 20, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, color: 'var(--text-light)' }}>{t('reports.startDate')}</span>
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.2)', color: 'white', fontSize: 13 }}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, color: 'var(--text-light)' }}>{t('reports.endDate')}</span>
            <input
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.2)', color: 'white', fontSize: 13 }}
            />
          </div>
        </div>
      )}

      {loading ? (
        <div className="glass-card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>{t('reports.loading')}</div>
      ) : error ? (
        <div className="glass-card" style={{ padding: 24, background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.2)', color: 'var(--status-nogo)' }}>
          {error.includes('Offline') ? t('reports.offlineNoCached') : error}
        </div>
      ) : chartData.length === 0 ? (
        <div className="glass-card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>{t('reports.selectDates')}</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: 20 }}>
          
          {/* Temperature Chart */}
          <div className="glass-card" style={{ padding: 20 }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Thermometer size={16} color="var(--accent-blue)" /> {t('reports.tempTrend')}
            </h3>
            {hasData('temperature') ? (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="tempGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="formattedTime" stroke="var(--text-muted)" fontSize={10} tickLine={false} />
                  <YAxis stroke="var(--text-muted)" fontSize={10} unit="°C" domain={['auto', 'auto']} tickLine={false} />
                  <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }} />
                  <Area type="monotone" dataKey="temperature" name="Temperature" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#tempGradient)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : renderNoData('temperature')}
          </div>

          {/* Wind Speed Chart */}
          <div className="glass-card" style={{ padding: 20 }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Wind size={16} color="var(--accent-blue)" /> {t('reports.windSpeed')}
            </h3>
            {hasData('windSpeed') ? (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="formattedTime" stroke="var(--text-muted)" fontSize={10} tickLine={false} />
                  <YAxis stroke="var(--text-muted)" fontSize={10} unit=" km/h" domain={[0, 'auto']} tickLine={false} />
                  <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }} />
                  <Line type="monotone" dataKey="windSpeed" name="Wind Speed" stroke="#22c55e" strokeWidth={2} activeDot={{ r: 6 }} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            ) : renderNoData('wind speed')}
          </div>

          {/* Wave Height Chart */}
          <div className="glass-card" style={{ padding: 20 }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Waves size={16} color="var(--accent-blue)" /> {t('reports.waveHeight')}
            </h3>
            {hasData('waveHeight') ? (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="waveGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="formattedTime" stroke="var(--text-muted)" fontSize={10} tickLine={false} />
                  <YAxis stroke="var(--text-muted)" fontSize={10} unit="m" domain={[0, 'auto']} tickLine={false} />
                  <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }} />
                  <Area type="monotone" dataKey="waveHeight" name="Wave Height" stroke="#06b6d4" strokeWidth={2} fillOpacity={1} fill="url(#waveGradient)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : renderNoData('wave height')}
          </div>

          {/* Precipitation Chart */}
          <div className="glass-card" style={{ padding: 20 }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <CloudRain size={16} color="var(--accent-blue)" /> {t('reports.precipitation')}
            </h3>
            {hasData('precipitation') ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="formattedTime" stroke="var(--text-muted)" fontSize={10} tickLine={false} />
                  <YAxis stroke="var(--text-muted)" fontSize={10} unit="mm" domain={[0, 'auto']} tickLine={false} />
                  <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }} />
                  <Bar dataKey="precipitation" name="Rainfall" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : renderNoData('precipitation')}
          </div>

          {/* Sea Surface Temperature (SST) Chart */}
          <div className="glass-card" style={{ padding: 20 }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Thermometer size={16} color="var(--accent-blue)" /> {t('reports.sstTrend')}
            </h3>
            {hasData('sst') ? (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="formattedTime" stroke="var(--text-muted)" fontSize={10} tickLine={false} />
                  <YAxis stroke="var(--text-muted)" fontSize={10} unit="°C" domain={['auto', 'auto']} tickLine={false} />
                  <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }} />
                  <Line type="monotone" dataKey="sst" name="SST" stroke="#ec4899" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            ) : renderNoData('SST')}
          </div>

          {/* Chlorophyll Trend Chart */}
          <div className="glass-card" style={{ padding: 20 }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <TrendingUp size={16} color="var(--accent-blue)" /> {t('reports.chlorophyllTrend')}
            </h3>
            {hasData('chlorophyll') ? (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="formattedTime" stroke="var(--text-muted)" fontSize={10} tickLine={false} />
                  <YAxis stroke="var(--text-muted)" fontSize={10} unit=" mg/m³" domain={['auto', 'auto']} tickLine={false} />
                  <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }} />
                  <Line type="monotone" dataKey="chlorophyll" name="Chlorophyll" stroke="#10b981" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            ) : renderNoData('chlorophyll')}
          </div>

          {/* Risk Level Chart */}
          <div className="glass-card" style={{ padding: 20, gridColumn: 'span 2' }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <AlertTriangle size={16} color="var(--status-caution)" /> {t('reports.riskRating')}
            </h3>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="riskGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="formattedTime" stroke="var(--text-muted)" fontSize={10} tickLine={false} />
                <YAxis
                  stroke="var(--text-muted)"
                  fontSize={10}
                  ticks={[1, 2, 3]}
                  tickFormatter={val => (val === 1 ? 'GO' : val === 2 ? 'CAUTION' : 'NO-GO')}
                  domain={[1, 3]}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}
                  formatter={(val: any) => [val === 1 ? t('reports.goLowRisk') : val === 2 ? t('reports.cautionModerate') : t('reports.noGoSevere'), t('reports.riskLevel')]}
                />
                <Area type="step" dataKey="riskScore" stroke="#f59e0b" strokeWidth={2} fillOpacity={1} fill="url(#riskGradient)" />
              </AreaChart>
            </ResponsiveContainer>
            <div style={{ marginTop: 12, display: 'flex', gap: 16, justifyContent: 'center', fontSize: 11, color: 'var(--text-muted)' }}>
              <span>{t('reports.riskGoLegend')}</span>
              <span>{t('reports.riskCautionLegend')}</span>
              <span>{t('reports.riskNoGoLegend')}</span>
            </div>
          </div>

        </div>
      )}
    </div>
  )
}
