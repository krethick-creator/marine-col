import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Bell, Globe, ChevronDown, Database, LogOut, Settings, User, LayoutDashboard, MapPin, HelpCircle, Check } from 'lucide-react'
import { useAppStore } from '../../store'
import { useAuthStore } from '../../store/authStore'
import { LANGUAGE_OPTIONS, useTranslation } from '../../locales'

export default function TopBar() {
  const { unreadAlertCount, clearAlertBadge, offlineMode, user, setLanguage } = useAppStore()
  const { user: authUser, logout } = useAuthStore()
  const { t } = useTranslation()
  const [menuOpen, setMenuOpen] = useState(false)
  const [langOpen, setLangOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const langRef = useRef<HTMLDivElement>(null)

  const currentLang = LANGUAGE_OPTIONS.find((l) => l.code === user.language) ?? LANGUAGE_OPTIONS[0]

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false)
      }
      if (langRef.current && !langRef.current.contains(event.target as Node)) {
        setLangOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelectLanguage = (code: string) => {
    setLanguage(code)
    setLangOpen(false)
  }

  return (
    <header className="top-bar">
      {/* Mock data notice (hidden, keeps layout spacing) */}
      <div className="mock-banner" style={{ flex: 1, background: 'transparent', border: 'none', padding: '0 0 0 4px', visibility: 'hidden' }}>
        <Database size={11} style={{ color: 'rgba(251,191,36,0.7)' }} />
        <span>{t('topbar.demoMode')}</span>
      </div>

      {/* Live indicator */}
      <div className="top-bar-pill">
        <div className={`live-dot`}
          style={{ background: offlineMode ? 'var(--status-caution)' : 'var(--status-go)' }}
        />
        {offlineMode ? t('topbar.offline') : t('topbar.liveData')}
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

      {/* ─── Language Selector ─────────────────────────────────────────── */}
      <div style={{ position: 'relative' }} ref={langRef}>
        <button
          id="language-selector"
          className="top-bar-pill"
          onClick={() => setLangOpen((o) => !o)}
          aria-label="Select language"
          aria-expanded={langOpen}
          style={{ cursor: 'pointer', gap: 5, padding: '5px 10px', userSelect: 'none' }}
        >
          <Globe size={14} />
          <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.03em' }}>
            {currentLang.code.toUpperCase()}
          </span>
          <ChevronDown size={11} style={{ transition: 'transform 0.2s', transform: langOpen ? 'rotate(180deg)' : 'rotate(0deg)' }} />
        </button>

        {langOpen && (
          <div style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            minWidth: 200,
            background: 'var(--surface-2, #1a2235)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 10,
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            zIndex: 1000,
            overflow: 'hidden',
            animation: 'fadeSlideIn 0.15s ease',
          }}>
            <div style={{ padding: '8px 12px 6px', fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Language / भाषा
            </div>
            {LANGUAGE_OPTIONS.map((opt) => {
              const isActive = opt.code === user.language
              return (
                <button
                  key={opt.code}
                  id={`lang-option-${opt.code}`}
                  onClick={() => handleSelectLanguage(opt.code)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    width: '100%',
                    padding: '8px 14px',
                    background: isActive ? 'rgba(59,130,246,0.15)' : 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    color: isActive ? 'var(--accent-blue, #3b82f6)' : 'var(--text-primary, #e2e8f0)',
                    fontSize: 13,
                    textAlign: 'left',
                    transition: 'background 0.12s',
                    gap: 10,
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.06)'
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = 'transparent'
                  }}
                >
                  <span style={{ fontWeight: isActive ? 600 : 400 }}>{opt.nativeLabel}</span>
                  <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 'auto', paddingLeft: 8 }}>{opt.label}</span>
                  {isActive && <Check size={13} style={{ flexShrink: 0, marginLeft: 4 }} />}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* User avatar & Dropdown */}
      <div style={{ position: 'relative' }} ref={menuRef}>
        <div
          className="avatar"
          style={{ width: 34, height: 34, cursor: 'pointer', border: menuOpen ? '2px solid rgba(255,255,255,0.4)' : 'none' }}
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {authUser?.name ? (
            <div style={{ background: 'var(--accent-blue)', color: 'white', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 'bold' }}>
              {authUser.name.charAt(0)}
            </div>
          ) : (
            <img src="https://ui-avatars.com/api/?name=Ramesh+K&background=3b82f6&color=fff" alt="User Avatar" />
          )}
        </div>

        {menuOpen && (
          <div className="profile-menu">
            <div style={{ padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 2, marginBottom: 4 }}>
              <span style={{ fontSize: 14, fontWeight: 600 }}>{authUser?.name || 'Guest'}</span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{authUser?.email || 'guest@orca.gov'}</span>
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
