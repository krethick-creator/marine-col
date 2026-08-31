import { useEffect, useState } from 'react'
import { MapPin, Navigation, Clock, ShieldCheck, Thermometer, Wind, Waves, CloudRain, Sun } from 'lucide-react'
import { useAppStore } from '../../store'
import { getWeatherForecast } from '../../services/api/weatherService'
import type { WeatherForecast } from '../../types'

export default function WeatherOceanPage() {
  const { currentWeather, weatherLoading, weatherError, user, setShowLocationModal } = useAppStore()
  const [forecast, setForecast] = useState<WeatherForecast | null>(null)
  const [forecastLoading, setForecastLoading] = useState(false)
  const [forecastError, setForecastError] = useState<string | null>(null)

  useEffect(() => {
    if (!user?.location?.lat || !user?.location?.lon) return

    setForecastLoading(true)
    setForecastError(null)

    getWeatherForecast(user.location.lat, user.location.lon, 7)
      .then(data => {
        setForecast(data)
        setForecastLoading(false)
      })
      .catch(err => {
        console.error(err)
        setForecastError('Failed to fetch forecast details.')
        setForecastLoading(false)
      })
  }, [user?.location?.lat, user?.location?.lon])

  const formatTime = (dateObj: Date) => {
    return dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const formatDate = (dateObj: Date) => {
    return dateObj.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })
  }

  return (
    <div className="page-shell">
      {/* Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Sun size={24} color="var(--accent-blue)" /> Weather & Ocean
          </h1>
          <p className="page-subtitle">Real-time marine forecast, wind dynamics, wave metrics, and multi-day alerts</p>
        </div>
        
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {currentWeather?.isMockData ? (
            <div style={{ fontSize: 11, color: 'rgba(251,191,36,0.6)', padding: '4px 12px', borderRadius: 99, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>⚠️ DEMO DATA</div>
          ) : currentWeather ? (
            <div style={{ fontSize: 11, color: 'rgba(74,222,128,0.8)', padding: '4px 12px', borderRadius: 99, background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.3)' }}>LIVE DATA</div>
          ) : null}
          
          <button 
            className="btn" 
            onClick={() => setShowLocationModal(true)}
            style={{ padding: '6px 12px', background: 'var(--accent-blue)', color: 'white', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <MapPin size={12} /> Change Location
          </button>
        </div>
      </div>

      {/* Location Bar */}
      <div className="glass" style={{ padding: '12px 20px', borderRadius: 12, marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <MapPin size={16} color="var(--accent-blue)" />
          <span style={{ fontSize: 14, fontWeight: 600 }}>{user.locationName || 'Location Not Selected'}</span>
          {user.location && (
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              ({user.location.lat.toFixed(4)}°N, {user.location.lon.toFixed(4)}°E)
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 12, color: 'var(--text-muted)' }}>
          {currentWeather && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <Clock size={12} />
                <span>Updated {currentWeather.timestamp?.toLocaleTimeString()}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <ShieldCheck size={12} color="var(--status-go)" />
                <span>Source: {forecast?.dataSource || 'Open-Meteo'}</span>
              </div>
            </>
          )}
        </div>
      </div>

      {weatherLoading && !currentWeather ? (
        <div className="glass-card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Loading real-time weather and ocean conditions...</div>
      ) : weatherError && !currentWeather ? (
        <div className="glass-card" style={{ padding: 24, background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.2)', color: 'var(--status-nogo)' }}>Weather provider failed: {weatherError}</div>
      ) : currentWeather ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          
          {/* Real-time Cards Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
            
            {/* Thermometer / Temp */}
            <div className="glass-card" style={{ padding: 20, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: 12, color: 'var(--text-light)', fontWeight: 500, textTransform: 'uppercase' }}>Temperature</div>
                  <div style={{ fontSize: 32, fontWeight: 700, marginTop: 8 }}>{currentWeather.temperature}°C</div>
                </div>
                <Thermometer size={24} color="var(--accent-blue)" />
              </div>
              <div style={{ marginTop: 16, fontSize: 13, color: 'var(--text-light)', display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div>Feels like: <strong>{currentWeather.feelsLike}°C</strong></div>
                <div>Condition: <strong>{currentWeather.condition}</strong></div>
              </div>
            </div>

            {/* Wind conditions */}
            <div className="glass-card" style={{ padding: 20, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: 12, color: 'var(--text-light)', fontWeight: 500, textTransform: 'uppercase' }}>Wind Dynamics</div>
                  <div style={{ fontSize: 24, fontWeight: 700, marginTop: 8 }}>{currentWeather.windSpeed} <span style={{ fontSize: 14, fontWeight: 500 }}>km/h</span></div>
                </div>
                <Wind size={24} color="var(--accent-blue)" />
              </div>
              <div style={{ marginTop: 16, fontSize: 13, color: 'var(--text-light)', display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div>Direction: <strong>{currentWeather.windDirection}</strong></div>
                <div>Gusts: <strong>{currentWeather.windGusts !== undefined ? `${currentWeather.windGusts} km/h` : 'N/A'}</strong></div>
              </div>
            </div>

            {/* Ocean conditions */}
            <div className="glass-card" style={{ padding: 20, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: 12, color: 'var(--text-light)', fontWeight: 500, textTransform: 'uppercase' }}>Wave & Surf</div>
                  <div style={{ fontSize: 24, fontWeight: 700, marginTop: 8 }}>
                    {currentWeather.waveHeight === null ? 'N/A' : `${currentWeather.waveHeight} m`}
                  </div>
                </div>
                <Waves size={24} color="var(--accent-blue)" />
              </div>
              <div style={{ marginTop: 16, fontSize: 13, color: 'var(--text-light)', display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div>Swell Period: <strong>{currentWeather.swellPeriod ? `${currentWeather.swellPeriod} s` : 'N/A'}</strong></div>
                <div>Sea State: <strong>{currentWeather.seaState}</strong></div>
              </div>
            </div>

            {/* Atmospheric Metrics */}
            <div className="glass-card" style={{ padding: 20, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: 12, color: 'var(--text-light)', fontWeight: 500, textTransform: 'uppercase' }}>Atmosphere</div>
                  <div style={{ fontSize: 20, fontWeight: 700, marginTop: 8 }}>
                    {currentWeather.pressure ? `${currentWeather.pressure} hPa` : `${currentWeather.humidity}% Humidity`}
                  </div>
                </div>
                <CloudRain size={24} color="var(--accent-blue)" />
              </div>
              <div style={{ marginTop: 16, fontSize: 13, color: 'var(--text-light)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div>Humidity: <strong>{currentWeather.humidity}%</strong></div>
                <div>Clouds: <strong>{currentWeather.cloudCover !== undefined ? `${currentWeather.cloudCover}%` : 'N/A'}</strong></div>
                <div>Rain Prob: <strong>{currentWeather.rainProbability}%</strong></div>
                <div>Visibility: <strong>{currentWeather.visibility ? `${(currentWeather.visibility / 1000).toFixed(1)} km` : 'N/A'}</strong></div>
              </div>
            </div>

          </div>

          {/* Sunrise and Sunset block */}
          {(currentWeather.sunrise || currentWeather.sunset) && (
            <div className="glass-card" style={{ padding: '14px 20px', display: 'flex', gap: 24, fontSize: 13, color: 'var(--text-light)', justifyContent: 'center' }}>
              {currentWeather.sunrise && <span>🌅 Sunrise: <strong>{currentWeather.sunrise}</strong></span>}
              {currentWeather.sunset && <span>🌇 Sunset: <strong>{currentWeather.sunset}</strong></span>}
            </div>
          )}

          {/* Hourly Forecast */}
          <div className="glass-card" style={{ padding: 20 }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 14 }}>24-Hour Marine Forecast</h3>
            {forecastLoading ? (
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Loading hourly forecast...</div>
            ) : forecastError ? (
              <div style={{ fontSize: 12, color: 'var(--status-nogo)' }}>{forecastError}</div>
            ) : forecast?.hourly ? (
              <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 8, scrollbarWidth: 'thin' }}>
                {forecast.hourly.slice(0, 24).map((h, idx) => (
                  <div 
                    key={idx} 
                    className="glass" 
                    style={{ minWidth: 90, padding: '12px 10px', borderRadius: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flexShrink: 0 }}
                  >
                    <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{formatTime(h.time)}</span>
                    <span style={{ fontSize: 18 }}>🌤️</span>
                    <span style={{ fontSize: 14, fontWeight: 700 }}>{h.temperature.toFixed(1)}°C</span>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', fontSize: 10, color: 'var(--text-light)', gap: 2, marginTop: 4 }}>
                      <span>💨 {h.windSpeed.toFixed(0)} km/h</span>
                      {h.waveHeight !== null && <span>🌊 {h.waveHeight.toFixed(1)}m</span>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>No hourly forecast data available.</div>
            )}
          </div>

          {/* Multi-day Forecast */}
          <div className="glass-card" style={{ padding: 20 }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 14 }}>7-Day Marine Outlook</h3>
            {forecastLoading ? (
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Loading 7-day outlook...</div>
            ) : forecastError ? (
              <div style={{ fontSize: 12, color: 'var(--status-nogo)' }}>{forecastError}</div>
            ) : forecast?.daily ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {forecast.daily.map((d, idx) => (
                  <div 
                    key={idx} 
                    className="glass" 
                    style={{ padding: '12px 20px', borderRadius: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}
                  >
                    <div style={{ minWidth: 140, fontWeight: 600, fontSize: 13 }}>{formatDate(d.date)}</div>
                    
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center', flex: 1, minWidth: 200, justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 90 }}>
                        <span style={{ fontSize: 16 }}>🌤️</span>
                        <span style={{ fontSize: 12, color: 'var(--text-light)' }}>{d.condition}</span>
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>
                        {d.low.toFixed(0)}° / <span style={{ fontWeight: 700 }}>{d.high.toFixed(0)}°C</span>
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-light)', display: 'flex', gap: 12 }}>
                        <span>💨 Max {d.windSpeedMax.toFixed(0)} km/h</span>
                        {d.waveHeightMax !== null && <span>🌊 Max {d.waveHeightMax.toFixed(1)}m</span>}
                      </div>
                    </div>

                    <div 
                      style={{ 
                        fontSize: 10, 
                        fontWeight: 700, 
                        padding: '4px 10px', 
                        borderRadius: 6, 
                        background: d.status === 'GO' ? 'rgba(16, 185, 129, 0.15)' : d.status === 'CAUTION' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                        color: d.status === 'GO' ? 'var(--status-go)' : d.status === 'CAUTION' ? 'var(--status-caution)' : 'var(--status-nogo)',
                        border: `1px solid ${d.status === 'GO' ? 'rgba(16, 185, 129, 0.3)' : d.status === 'CAUTION' ? 'rgba(245, 158, 11, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
                      }}
                    >
                      {d.status === 'GO' ? 'SAFE WINDOW' : d.status === 'CAUTION' ? 'CAUTION ADVISED' : 'RESTRICTED'}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>No outlook forecast data available.</div>
            )}
          </div>

        </div>
      ) : (
        <div className="glass-card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
          Please select a location to fetch weather and ocean reports.
        </div>
      )}
    </div>
  )
}
