import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Bell, Globe, ChevronDown, Database, LogOut, Settings, User, LayoutDashboard, MapPin, HelpCircle } from 'lucide-react'
import { useAppStore } from '../../store'
import { useAuthStore } from '../../store/authStore'

export default function TopBar() {
  const { unreadAlertCount, clearAlertBadge, offlineMode, lastSyncTime, deferredPrompt, setDeferredPrompt, isInstallable, setIsInstallable, isAppInstalled } = useAppStore()
  const { user, logout } = useAuthStore()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      if (outcome === 'accepted') {
        setIsInstallable(false)
      }
      setDeferredPrompt(null)
    }
  }

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <header className="top-bar">
      {/* Mock data notice */}
      <div className="mock-banner" style={{ flex: 1, background: 'transparent', border: 'none', padding: '0 0 0 4px', visibility: 'hidden' }}>
        <Database size={11} style={{ color: 'rgba(251,191,36,0.7)' }} />
        <span>DEMO MODE</span>
      </div>

      {isInstallable && !isAppInstalled && (
        <button
          className="top-bar-pill"
          onClick={handleInstallClick}
          style={{ background: 'var(--accent-blue)', color: 'white', border: 'none', cursor: 'pointer' }}
        >
          Install App
        </button>
      )}

      {/* Live indicator */}
      <div className="top-bar-pill" style={{ flexDirection: 'column', alignItems: 'flex-start', padding: '4px 10px', gap: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div className={`live-dot ${offlineMode ? '' : ''}`}
            style={{ background: offlineMode ? 'var(--status-caution)' : 'var(--status-go)' }}
          />
          {offlineMode ? 'OFFLINE' : 'ONLINE'}
        </div>
        {offlineMode && (
          <div style={{ fontSize: '9px', color: 'var(--status-caution)', marginTop: '2px', marginLeft: '12px' }}>
            Using cached data
          </div>
        )}
        <div style={{ fontSize: '9px', color: 'var(--text-muted)', marginTop: '2px', marginLeft: '12px' }}>
          Last sync: {lastSyncTime ? lastSyncTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'N/A'}
        </div>
      </div>

      {/* Alerts bell */}
      <button
        className="top-bar-pill"
        onClick={clearAlertBadge}
        id="alerts-bell-btn"
        aria-label="View alerts"
        style={{ position: 'relative', cursor: 'pointer', padding: '6px 10px' }}
      >
        <Bell size={14} />
        {unreadAlertCount > 0 && (
          <span style={{
            position: 'absolute', top: 2, right: 2,
            width: 8, height: 8, borderRadius: '50%',
            background: 'var(--status-nogo)',
            boxShadow: '0 0 0 2px rgba(239,68,68,0.3)',
          }} />
        )}
      </button>

      {/* Language selector */}
      <div className="top-bar-pill" id="language-selector">
        <Globe size={14} />
        <span>EN</span>
        <ChevronDown size={12} />
      </div>

      {/* User avatar & Dropdown */}
      <div style={{ position: 'relative' }} ref={menuRef}>
        <div 
          className="avatar" 
          style={{ width: 34, height: 34, cursor: 'pointer', border: menuOpen ? '2px solid rgba(255,255,255,0.4)' : 'none' }}
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {user?.name ? (
            <div style={{ background: 'var(--accent-blue)', color: 'white', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 'bold' }}>
              {user.name.charAt(0)}
            </div>
          ) : (
            <img src="https://ui-avatars.com/api/?name=Ramesh+K&background=3b82f6&color=fff" alt="User Avatar" />
          )}
        </div>

        {menuOpen && (
          <div className="profile-menu">
            <div style={{ padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 2, marginBottom: 4 }}>
              <span style={{ fontSize: 14, fontWeight: 600 }}>{user?.name || 'Guest'}</span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{user?.email || 'guest@orca.gov'}</span>
            </div>
            
            <div className="profile-menu-divider" />
            
            <Link to="/profile" className="profile-menu-item" onClick={() => setMenuOpen(false)}>
              <User size={16} color="var(--text-muted)" /> Profile
            </Link>
            <Link to="/dashboard" className="profile-menu-item" onClick={() => setMenuOpen(false)}>
              <LayoutDashboard size={16} color="var(--text-muted)" /> Dashboard
            </Link>
            <Link to="/planner" className="profile-menu-item" onClick={() => setMenuOpen(false)}>
              <MapPin size={16} color="var(--text-muted)" /> Saved Trips
            </Link>
            
            <div className="profile-menu-divider" />
            
            <Link to="/settings" className="profile-menu-item" onClick={() => setMenuOpen(false)}>
              <Settings size={16} color="var(--text-muted)" /> Settings
            </Link>
            <Link to="/help" className="profile-menu-item" onClick={() => setMenuOpen(false)}>
              <HelpCircle size={16} color="var(--text-muted)" /> Help
            </Link>
            
            <div className="profile-menu-divider" />
            
            <button className="profile-menu-item" onClick={() => { setMenuOpen(false); logout(); }} style={{ color: '#fca5a5' }}>
              <LogOut size={16} color="#fca5a5" /> Logout
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
