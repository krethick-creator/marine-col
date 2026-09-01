import { NavLink, useLocation } from 'react-router-dom'
import {
  Home, Map, Calendar, Cloud, Fish, AlertTriangle,
  Flag, Users, LifeBuoy, Wifi, WifiOff, Settings,
  Compass, BarChart2, MapPin
} from 'lucide-react'
import OrcaLogo from '../ui/OrcaLogo'
import { useAppStore } from '../../store'
import { useAuthStore } from '../../store/authStore'
import { roleConfigs } from '../../config/roleConfig'
import type { UserRole } from '../../config/roleConfig'

const allNavItems = [
  { id: 'home', to: '/home', icon: Home, label: 'Home', end: true },
  { id: 'research_dashboard', to: '/home', icon: Home, label: 'Research Dashboard', end: true },
  { id: 'operations_dashboard', to: '/home', icon: Home, label: 'Operations Dashboard', end: true },
  { id: 'live_marine_map', to: '/map', icon: Map, label: 'Live Marine Map' },
  { id: 'marine_map', to: '/map', icon: Map, label: 'Marine Map' },
  { id: 'gis_map', to: '/map', icon: Map, label: 'GIS Map' },
  { id: 'weather', to: '/weather', icon: Cloud, label: 'Weather' },
  { id: 'ocean', to: '/weather', icon: Cloud, label: 'Ocean' },
  { id: 'sea_conditions', to: '/weather', icon: Cloud, label: 'Sea Conditions' },
  { id: 'fishing_intelligence', to: '/fishing', icon: Fish, label: 'Fishing Intelligence' },
  { id: 'marine_boundaries', to: '/boundaries', icon: Flag, label: 'Marine Boundaries' },
  { id: 'boundaries', to: '/boundaries', icon: Flag, label: 'Boundaries' },
  { id: 'navigation', to: '/map', icon: Compass, label: 'Navigation' },
  { id: 'alerts', to: '/alerts', icon: AlertTriangle, label: 'Alerts', badge: true },
  { id: 'sos', to: '/sos', icon: LifeBuoy, label: 'SOS' },
  { id: 'sms', to: '/settings', icon: Settings, label: 'SMS' },
  { id: 'satellite_data', to: '/weather', icon: Cloud, label: 'Satellite / EO Data' },
  { id: 'ocean_data', to: '/weather', icon: Cloud, label: 'Ocean Data' },
  { id: 'analysis', to: '/reports', icon: BarChart2, label: 'Analysis' },
  { id: 'historical_climate', to: '/climate', icon: Compass, label: 'Historical Climate' },
  { id: 'reports', to: '/reports', icon: BarChart2, label: 'Reports' },
  { id: 'ai_research_assistant', to: '/chat', icon: Users, label: 'AI Research Assistant' },
  { id: 'incidents', to: '/community', icon: AlertTriangle, label: 'Incidents' },
  { id: 'disaster_monitoring', to: '/alerts', icon: AlertTriangle, label: 'Disaster Monitoring' },
  { id: 'learn', to: '/community', icon: Users, label: 'Learn' },
  { id: 'orca_ai', to: '/chat', icon: Users, label: 'ORCA AI' },
  { id: 'community', to: '/community', icon: Users, label: 'Community' },
]

export default function Sidebar() {
  const { currentWeather, weatherLoading, weatherError, offlineMode, toggleOfflineMode, unreadAlertCount, user: appUser } = useAppStore()
  const { user } = useAuthStore()
  const location = useLocation()
  
  const role: UserRole = (user?.role as UserRole) || 'general'
  const config = roleConfigs[role] || roleConfigs.general
  const navItems = allNavItems.filter(item => config.features.includes(item.id))

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
            Navigate Smarter. Talk Safely.
          </div>
        </div>
      </div>

      {/* Nav label */}
      <div className="nav-section-label">Navigation</div>

      {/* Nav items */}
      {navItems.map(({ id, to, icon: Icon, label, badge, end }) => {
        const isActive = end
          ? location.pathname === to
          : location.pathname.startsWith(to)
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
              <MapPin size={14} /> Set Location
            </div>
          ) : weatherLoading && !currentWeather ? (
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Loading weather...</div>
          ) : weatherError && !currentWeather ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ fontSize: 12, color: 'var(--status-nogo)' }}>Weather unavailable</div>
              <span 
                style={{ fontSize: 11, color: 'var(--accent-blue)', cursor: 'pointer', fontWeight: 500 }}
                onClick={() => useAppStore.getState().setShowLocationModal(true)}
              >
                Change Location
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
                  Change
                </span>
              </div>
            </>
          ) : (
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>No data</div>
          )}
        </div>

        {/* Offline mode toggle */}
        <div className="offline-toggle">
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
              {offlineMode ? 'Offline Mode' : 'Online'}
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-light)', marginTop: 2 }}>
              {offlineMode ? 'Data saved for offline use' : 'Live data active'}
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
