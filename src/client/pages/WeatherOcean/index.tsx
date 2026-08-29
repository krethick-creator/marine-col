import { useAppStore } from '../../store'

// Weather & Ocean page stub
export default function WeatherOceanPage() {
  const { currentWeather, weatherLoading, weatherError } = useAppStore()

  return (
    <div className="page-shell">
      <div className="page-header">
        <div>
          <h1 className="page-title">Weather & Ocean</h1>
          <p className="page-subtitle">Marine forecast, wave conditions, SST and more</p>
        </div>
        {currentWeather?.isMockData ? (
          <div style={{ fontSize: 11, color: 'rgba(251,191,36,0.6)', padding: '4px 12px', borderRadius: 99, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>⚠️ DEMO DATA</div>
        ) : currentWeather ? (
          <div style={{ fontSize: 11, color: 'rgba(74,222,128,0.8)', padding: '4px 12px', borderRadius: 99, background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.3)' }}>LIVE DATA</div>
        ) : null}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 16 }}>
        {weatherLoading && !currentWeather ? (
          <div className="glass-card" style={{ padding: 18, fontSize: 14, color: 'var(--text-light)' }}>Loading weather...</div>
        ) : weatherError ? (
          <div className="glass-card" style={{ padding: 18, fontSize: 14, color: 'var(--status-nogo)' }}>Weather data temporarily unavailable</div>
        ) : currentWeather ? (
          <div className="glass-card" style={{ padding: 18 }}>
            <div style={{ fontFamily: 'Outfit,sans-serif', fontSize: 16, fontWeight: 700, color: 'var(--text-main)', marginBottom: 10 }}>Current Conditions</div>
            <div style={{ fontSize: 28, marginBottom: 6 }}>{currentWeather.temperature}°C</div>
            <div style={{ fontSize: 14, color: 'rgba(184,223,240,0.7)', marginBottom: 16 }}>{currentWeather.condition}</div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div className="evidence-item">
                <div className="evidence-label">Wind</div>
                <div className="evidence-value">{currentWeather.windSpeed} km/h {currentWeather.windDirection}</div>
              </div>
              <div className="evidence-item">
                <div className="evidence-label">Waves</div>
                <div className="evidence-value">{currentWeather.waveHeight === null ? 'Unavailable' : `${currentWeather.waveHeight} m`}</div>
              </div>
              <div className="evidence-item">
                <div className="evidence-label">Sea State</div>
                <div className="evidence-value">{currentWeather.seaState === 'UNKNOWN' ? 'Unknown' : currentWeather.seaState}</div>
              </div>
            </div>
            <div style={{ marginTop: 14, fontSize: 11, color: 'var(--text-muted)' }}>
              Updated {currentWeather.timestamp?.toLocaleTimeString()}
            </div>
          </div>
        ) : null}
      </div>

      <div className="glass-card" style={{ padding: 24, textAlign: 'center', marginTop: 24 }}>
        <div style={{ fontSize: 13, color: 'rgba(184,223,240,0.5)' }}>
          📊 Recharts weather charts (hourly wind, wave height, SST, chlorophyll) — Phase 2 implementation
        </div>
      </div>
    </div>
  )
}
