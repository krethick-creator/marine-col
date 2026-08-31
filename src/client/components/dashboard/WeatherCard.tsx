import { CloudRain, Wind, Waves, Thermometer } from 'lucide-react'
import { useAppStore } from '../../store'
import { useTranslation } from '../../locales'

export default function WeatherCard() {
  const { currentWeather, weatherLoading, weatherError, user } = useAppStore()
  const { t } = useTranslation()

  return (
    <div className="glass-card" style={{ padding: 24, borderTop: '2px solid var(--accent-blue)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-main)' }}>{t('weather.marineWeather')}</h3>
          <div style={{ fontSize: 13, color: 'var(--text-light)', marginTop: 4 }}>
            {user?.locationName || currentWeather?.location || t('weather.selectLocation')}
          </div>
        </div>
        {currentWeather?.isMockData ? (
          <div style={{ fontSize: 10, color: 'rgba(251,191,36,0.8)', padding: '2px 8px', borderRadius: 12, background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)' }}>
            {t('data.demoData')}
          </div>
        ) : currentWeather ? (
          <div style={{ fontSize: 10, color: 'rgba(74,222,128,0.9)', padding: '2px 8px', borderRadius: 12, background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.3)' }}>
            {t('data.realData')}
          </div>
        ) : null}
      </div>

      {weatherLoading && !currentWeather ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, color: 'var(--text-muted)' }}>
          <div>{t('weather.loading')}</div>
        </div>
      ) : currentWeather ? (
        <>
          {weatherError && (
            <div style={{ color: 'var(--status-nogo)', fontSize: 12, marginBottom: 12, padding: 8, background: 'rgba(239,68,68,0.1)', borderRadius: 4 }}>
              {t('weather.failedUpdate')}: {weatherError}. {t('weather.showingLast')}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div style={{ padding: 16, background: 'rgba(126,200,227,0.05)', borderRadius: 12, border: '1px solid rgba(126,200,227,0.1)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-light)', fontSize: 13, marginBottom: 8 }}>
                <Thermometer size={16} /> {t('weather.temp')}
              </div>
              <div style={{ fontSize: 24, fontWeight: 700 }}>
                {currentWeather ? `${currentWeather.temperature}°C` : '--'}
              </div>
            </div>

            <div style={{ padding: 16, background: 'rgba(126,200,227,0.05)', borderRadius: 12, border: '1px solid rgba(126,200,227,0.1)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-light)', fontSize: 13, marginBottom: 8 }}>
                <Wind size={16} /> {t('weather.wind')}
              </div>
              <div style={{ fontSize: 24, fontWeight: 700 }}>
                {currentWeather ? `${currentWeather.windSpeed} km/h` : '--'}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                {currentWeather?.windDirection || ''}
              </div>
            </div>

            <div style={{ padding: 16, background: 'rgba(126,200,227,0.05)', borderRadius: 12, border: '1px solid rgba(126,200,227,0.1)', gridColumn: '1 / -1' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-light)', fontSize: 13, marginBottom: 8 }}>
                <Waves size={16} /> {t('weather.wave')}
              </div>
              <div style={{ fontSize: 24, fontWeight: 700 }}>
                {currentWeather?.waveHeight !== null && currentWeather?.waveHeight !== undefined
                  ? `${currentWeather.waveHeight}m`
                  : '--'}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                {currentWeather?.seaState || t('weather.dataUnavailable')}
              </div>
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
