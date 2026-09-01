import { NavLink, useLocation } from 'react-router-dom'
import {
  Home, Map, Calendar, Cloud, Fish, AlertTriangle,
  Flag, Users, LifeBuoy, Settings,
  Compass, BarChart2, MapPin
} from 'lucide-react'
import OrcaLogo from '../ui/OrcaLogo'
import { useAppStore } from '../../store'
import { useAuthStore } from '../../store/authStore'
import { roleConfigs } from '../../config/roleConfig'
import type { UserRole } from '../../config/roleConfig'
import { useTranslation } from '../../locales'

const allNavItems = [
  { id: 'home', to: '/home', icon: Home, labelKey: 'nav.home', end: true },
  { id: 'research_dashboard', to: '/home', icon: Home, labelKey: 'dashboard.title', end: true },
  { id: 'operations_dashboard', to: '/home', icon: Home, labelKey: 'dashboard.title', end: true },
  { id: 'live_marine_map', to: '/map', icon: Map, labelKey: 'nav.liveMap' },
  { id: 'marine_map', to: '/map', icon: Map, labelKey: 'nav.liveMap' },
  { id: 'gis_map', to: '/map', icon: Map, labelKey: 'nav.liveMap' },
  { id: 'weather', to: '/weather', icon: Cloud, labelKey: 'nav.weather' },
  { id: 'ocean', to: '/weather', icon: Cloud, labelKey: 'nav.weather' },
  { id: 'sea_conditions', to: '/weather', icon: Cloud, labelKey: 'nav.weather' },
  { id: 'fishing_intelligence', to: '/fishing', icon: Fish, labelKey: 'nav.fishing' },
  { id: 'marine_boundaries', to: '/boundaries', icon: Flag, labelKey: 'nav.boundaries' },
  { id: 'boundaries', to: '/boundaries', icon: Flag, labelKey: 'nav.boundaries' },
  { id: 'navigation', to: '/map', icon: Compass, labelKey: 'nav.liveMap' },
  { id: 'alerts', to: '/alerts', icon: AlertTriangle, labelKey: 'nav.alerts', badge: true },
  { id: 'sos', to: '/sos', icon: LifeBuoy, labelKey: 'nav.sos' },
  { id: 'sms', to: '/settings', icon: Settings, labelKey: 'nav.sos' },
  { id: 'satellite_data', to: '/weather', icon: Cloud, labelKey: 'nav.weather' },
  { id: 'ocean_data', to: '/weather', icon: Cloud, labelKey: 'nav.weather' },
  { id: 'analysis', to: '/reports', icon: BarChart2, labelKey: 'nav.reports' },
  { id: 'historical_climate', to: '/climate', icon: Compass, labelKey: 'nav.climate' },
  { id: 'reports', to: '/reports', icon: BarChart2, labelKey: 'nav.reports' },
  { id: 'ai_research_assistant', to: '/home', icon: Users, labelKey: 'nav.home' },
  { id: 'incidents', to: '/community', icon: AlertTriangle, labelKey: 'nav.community' },
  { id: 'disaster_monitoring', to: '/alerts', icon: AlertTriangle, labelKey: 'nav.alerts' },
  { id: 'learn', to: '/community', icon: Users, labelKey: 'nav.community' },
  { id: 'orca_ai', to: '/home', icon: Users, labelKey: 'nav.home' },
  { id: 'community', to: '/community', icon: Users, labelKey: 'nav.community' },
]

export default function Sidebar() {
  const { currentWeather, weatherLoading, weatherError, offlineMode, toggleOfflineMode, unreadAlertCount, user: appUser } = useAppStore()
  const { user } = useAuthStore()
  const location = useLocation()
  const { t } = useTranslation()

  const normalizedRole = String((user?.role || appUser?.role || 'general')).toLowerCase().replace(/\s+/g, '_') as UserRole
  const config = roleConfigs[normalizedRole] || roleConfigs.general
  const navItems = allNavItems.filter(item => config.features.includes(item.id)).map(item => ({ ...item, label: t(item.labelKey as any) }))

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <OrcaLogo size={34} />
        <div>
          <div className="hero-title">ORCA</div>
          <div style={{ fontSize: 11, color: 'var(--text-light)', fontWeight: 500, letterSpacing: '0.02em', marginTop: 2 }}>
            {t('sidebar.tagline')}
          </div>
        </div>
      </div>

      <div className="nav-section-label">{t('nav.section')}</div>

      {navItems.map(({ id, to, icon: Icon, label, badge, end }) => {
        const isActive = end ? location.pathname === to : location.pathname.startsWith(to)
        const badgeCount = badge ? unreadAlertCount : 0

        return (
          <NavLink
            key={id}
            to={to}
            end={end}
            className={`nav-item ${isActive ? 'active' : ''}`}
            style={{ textDecoration: 'none' }}
          >
            <Icon size={16} strokeWidth={1.8} style={{ flexShrink: 0 }} />
            <span>{label}</span>
            {badgeCount > 0 && <span className="nav-badge">{badgeCount}</span>}
          </NavLink>
        )
      })}

      <div className="sidebar-bottom">
        <div className="weather-mini-card" style={{ minHeight: 64, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          {!appUser.location ? (
            <div
              style={{ fontSize: 13, color: 'var(--accent-blue)', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}
              onClick={() => useAppStore.getState().setShowLocationModal(true)}
            >
              <MapPin size={14} /> {t('sidebar.setLocation')}
            </div>
          ) : weatherLoading && !currentWeather ? (
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{t('sidebar.loadingWeather')}</div>
          ) : weatherError && !currentWeather ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ fontSize: 12, color: 'var(--status-nogo)' }}>{t('sidebar.weatherUnavailable')}</div>
              <span
                style={{ fontSize: 11, color: 'var(--accent-blue)', cursor: 'pointer', fontWeight: 500 }}
                onClick={() => useAppStore.getState().setShowLocationModal(true)}
              >
                {t('sidebar.changeLocation')}
              </span>
            </div>
          ) : currentWeather ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 24 }}>🌤️</span>
                <div>
                  <div className="temp">{currentWeather.temperature}°C</div>
                  <div className="loc">{currentWeather.condition}</div>
                </div>
              </div>
              <div className="loc" style={{ marginTop: 6, fontWeight: 500, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: 120 }}>
                  {appUser.locationName || currentWeather.location}
                </span>
                <span
                  style={{ fontSize: 10, color: 'var(--accent-blue)', cursor: 'pointer', fontWeight: 600 }}
                  onClick={() => useAppStore.getState().setShowLocationModal(true)}
                >
                  {t('sidebar.change')}
                </span>
              </div>
            </>
          ) : (
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{t('sidebar.noData')}</div>
          )}
        </div>

        <div className="offline-toggle">
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
              {offlineMode ? t('sidebar.offlineMode') : t('sidebar.online')}
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-light)', marginTop: 2 }}>
              {offlineMode ? t('sidebar.offlineDesc') : t('sidebar.onlineDesc')}
            </div>
          </div>
          <div
            className={`toggle-switch ${offlineMode ? 'on' : ''}`}
            onClick={toggleOfflineMode}
            role="switch"
            aria-checked={offlineMode}
            aria-label="Toggle offline mode"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && toggleOfflineMode()}
          />
        </div>

        <div className="user-card">
          <div className="avatar">
            {user?.name ? (
              <div style={{ background: 'var(--accent-blue)', color: 'white', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 'bold' }}>
                {user.name.charAt(0)}
              </div>
            ) : (
              <img src="https://ui-avatars.com/api/?name=Ramesh+K&background=3b82f6&color=fff" alt="User Avatar" />
            )}
          </div>
          <div className="user-card-info" style={{ flex: 1, minWidth: 0, marginLeft: 2 }}>
            <div className="user-card-name" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user?.name || 'Guest'}
            </div>
            <div className="user-card-role" style={{ textTransform: 'capitalize' }}>
              {String(user?.role || 'Fisherman').toLowerCase()}
            </div>
          </div>
          <div style={{ fontSize: 16, color: 'var(--text-light)', cursor: 'pointer' }}>
            <Settings size={16} />
          </div>
        </div>
      </div>
    </aside>
  )
}
