import { NavLink, useLocation } from 'react-router-dom'
import {
  Home, Map, Calendar, Cloud, Fish, AlertTriangle,
  Flag, Users, LifeBuoy, MessageSquare, Wifi, WifiOff, Settings,
  Compass, BarChart2, MapPin
} from 'lucide-react'
import OrcaLogo from '../ui/OrcaLogo'
import { useAppStore } from '../../store'
import { useAuthStore } from '../../store/authStore'
import { useTranslation } from '../../locales'

export default function Sidebar() {
  const { currentWeather, weatherLoading, weatherError, offlineMode, toggleOfflineMode, unreadAlertCount, user: appUser } = useAppStore()
  const { user } = useAuthStore()
  const location = useLocation()
  const { t } = useTranslation()

  const navItems = [
    { to: '/home',      icon: Home,          label: t('nav.home'),             end: true },
    { to: '/map',       icon: Map,           label: t('nav.liveMap') },
    { to: '/planner',   icon: Calendar,      label: t('nav.tripPlanner') },
    { to: '/weather',   icon: Cloud,         label: t('nav.weather') },
    { to: '/climate',   icon: Compass,       label: t('nav.climate') },
    { to: '/reports',   icon: BarChart2,     label: t('nav.reports') },
    { to: '/fishing',   icon: Fish,          label: t('nav.fishing') },
    { to: '/alerts',    icon: AlertTriangle, label: t('nav.alerts'), badge: true },
    { to: '/boundaries',icon: Flag,          label: t('nav.boundaries') },
    { to: '/community', icon: Users,         label: t('nav.community') },
    { to: '/sos',       icon: LifeBuoy,      label: t('nav.sos') },
    { to: '/feedback',  icon: MessageSquare, label: t('nav.feedback') },
  ]

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <OrcaLogo size={34} />
        <div>
          <div className="hero-title">
            ORCA
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-light)', fontWeight: 500, letterSpacing: '0.02em', marginTop: 2 }}>
            {t('sidebar.tagline')}
          </div>
        </div>
      </div>

      {/* Nav label */}
      <div className="nav-section-label">{t('nav.section')}</div>

      {/* Nav items */}
      {navItems.map(({ to, icon: Icon, label, badge, end }) => {
        const isActive = end
          ? location.pathname === to
          : location.pathname.startsWith(to)
        const badgeCount = badge ? unreadAlertCount : 0

        return (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={`nav-item ${isActive ? 'active' : ''}`}
            style={{ textDecoration: 'none' }}
          >
            <Icon size={16} strokeWidth={1.8} style={{ flexShrink: 0 }} />
            <span>{label}</span>
            {badgeCount > 0 && (
              <span className="nav-badge">{badgeCount}</span>
            )}
          </NavLink>
        )
      })}

      {/* Bottom section */}
      <div className="sidebar-bottom">
        {/* Weather mini card */}
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
                  <div className="temp">
                    {currentWeather.temperature}°C
                  </div>
                  <div className="loc">
                    {currentWeather.condition}
                  </div>
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

        {/* Offline mode toggle */}
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

        {/* User card */}
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
              {user?.role?.toLowerCase() || 'Fisherman'}
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
