import { useAppStore } from '../../store'

export default function WeatherCard() {
  const { currentWeather, weatherLoading, weatherError } = useAppStore()

  return (
    <div className="glass-card" style={{ padding: 24, borderTop: '2px solid var(--accent-blue)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-main)' }}>Marine Weather</h3>
          <div style={{ fontSize: 13, color: 'var(--text-light)', marginTop: 4 }}>
            {currentWeather?.location || 'Chennai Coast'}
          </div>
        </div>
        {currentWeather?.isMockData ? (
          <div style={{ fontSize: 10, color: 'rgba(251,191,36,0.8)', padding: '2px 8px', borderRadius: 12, background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)' }}>
            DEMO DATA — Not real marine intelligence
          </div>
        ) : currentWeather ? (
          <div style={{ fontSize: 10, color: 'rgba(74,222,128,0.9)', padding: '2px 8px', borderRadius: 12, background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.3)' }}>
            REAL-TIME MARINE DATA
          </div>
        ) : null}
      </div>

      {weatherLoading && !currentWeather ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, color: 'var(--text-muted)' }}>
          <div>Weather: Loading...</div>
          <div>Wind: Loading...</div>
          <div>Wave: Loading...</div>
        </div>
      ) : currentWeather ? (
        <>
          {weatherError && (
            <div style={{ color: 'var(--status-nogo)', fontSize: 12, marginBottom: 12, padding: 8, background: 'rgba(239,68,68,0.1)', borderRadius: 4 }}>
              Failed to update weather: {weatherError}. Showing last known data.
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
            <div style={{ fontSize: 36 }}>{currentWeather.temperature}°C</div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 600 }}>{currentWeather.condition}</div>
              <div style={{ fontSize: 12, color: 'var(--text-light)' }}>Feels like {currentWeather.feelsLike}°C</div>
            </div>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className="evidence-item" style={{ background: 'rgba(255,255,255,0.03)', padding: '8px 12px', borderRadius: 8 }}>
              <div className="evidence-label" style={{ fontSize: 11 }}>Wind</div>
              <div className="evidence-value" style={{ fontSize: 14 }}>{currentWeather.windSpeed} km/h {currentWeather.windDirection}</div>
            </div>
            <div className="evidence-item" style={{ background: 'rgba(255,255,255,0.03)', padding: '8px 12px', borderRadius: 8 }}>
              <div className="evidence-label" style={{ fontSize: 11 }}>Wave Height</div>
              <div className="evidence-value" style={{ fontSize: 14 }}>{currentWeather.waveHeight === null ? 'Unavailable' : `${currentWeather.waveHeight} m`}</div>
            </div>
            <div className="evidence-item" style={{ background: 'rgba(255,255,255,0.03)', padding: '8px 12px', borderRadius: 8 }}>
              <div className="evidence-label" style={{ fontSize: 11 }}>Sea State</div>
              <div className="evidence-value" style={{ fontSize: 14 }}>{currentWeather.seaState === 'UNKNOWN' ? 'Unknown' : currentWeather.seaState}</div>
            </div>
            <div className="evidence-item" style={{ background: 'rgba(255,255,255,0.03)', padding: '8px 12px', borderRadius: 8 }}>
              <div className="evidence-label" style={{ fontSize: 11 }}>Visibility</div>
              <div className="evidence-value" style={{ fontSize: 14 }}>{currentWeather.visibility / 1000} km</div>
            </div>
          </div>

          <div style={{ marginTop: 16, fontSize: 11, color: 'var(--text-muted)', textAlign: 'right' }}>
            Updated {currentWeather.timestamp?.toLocaleTimeString()}
          </div>
        </>
      ) : (
        <div style={{ color: 'var(--status-nogo)', fontSize: 14 }}>
          {weatherError ? `Weather data unavailable: ${weatherError}` : 'Data unavailable'}
        </div>
      )}
    </div>
  )
}
