import { NavLink, useLocation } from 'react-router-dom'
import {
  Home, Map, Calendar, Cloud, Fish, AlertTriangle,
  Flag, Users, LifeBuoy, MessageSquare, Wifi, WifiOff, Settings
} from 'lucide-react'
import OrcaLogo from '../ui/OrcaLogo'
import { useAppStore } from '../../store'
import { useAuthStore } from '../../store/authStore'

const navItems = [
  { to: '/home',      icon: Home,          label: 'Home',             end: true },
  { to: '/map',       icon: Map,           label: 'Live Map' },
  { to: '/planner',   icon: Calendar,      label: 'Trip Planner' },
  { to: '/weather',   icon: Cloud,         label: 'Weather & Ocean' },
  { to: '/fishing',   icon: Fish,          label: 'Fishing Zones' },
  { to: '/alerts',    icon: AlertTriangle, label: 'Alerts & Warnings', badge: true },
  { to: '/boundaries',icon: Flag,          label: 'Boundaries' },
  { to: '/community', icon: Users,         label: 'Community' },
  { to: '/sos',       icon: LifeBuoy,      label: 'SOS & Safety' },
  { to: '/feedback',  icon: MessageSquare, label: 'Feedback' },
]

export default function Sidebar() {
  const { currentWeather, weatherLoading, weatherError, offlineMode, toggleOfflineMode, unreadAlertCount } = useAppStore()
  const { user } = useAuthStore()
  const location = useLocation()

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
        <div className="weather-mini-card" style={{ minHeight: 64 }}>
          {weatherLoading && !currentWeather ? (
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Loading...</div>
          ) : weatherError ? (
            <div style={{ fontSize: 12, color: 'var(--status-nogo)' }}>Weather unavailable</div>
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
              <div className="loc" style={{ marginTop: 6, fontWeight: 500 }}>
                {currentWeather.location}
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
