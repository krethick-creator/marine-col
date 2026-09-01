import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { MapPin, Navigation, Clock, ShieldAlert, Activity, ArrowRight, Zap, Fish, Compass, Calendar, Flag, BarChart2, FileText, LifeBuoy, Map as MapIcon, Cloud } from 'lucide-react';
import WeatherCard from '../../components/dashboard/WeatherCard';
import { fetchActiveAlerts } from '../../services/api/alertService';
import type { Alert } from '../../types';
import { useAppStore } from '../../store';
import { useTranslation } from '../../locales';
import { mapRoleToCanonicalRole, ROLE_CONFIGS } from '../../config/roleConfig';

export default function DashboardPage() {
  const { user: authUser } = useAuthStore();
  const appUser = useAppStore(state => state.user);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const { t } = useTranslation();
  const navigate = useNavigate();

  const rawRole = authUser?.role || (appUser as any)?.role;
  const canonicalRole = mapRoleToCanonicalRole(rawRole);
  const roleConfig = ROLE_CONFIGS[canonicalRole];

  useEffect(() => {
    const lat = appUser.location?.lat ?? 13.0827;
    const lon = appUser.location?.lon ?? 80.2707;
    setLoading(true);
    fetchActiveAlerts(lat, lon)
      .then(data => {
        setAlerts(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [appUser.location?.lat, appUser.location?.lon]);

  const handleQuickActionClick = (query: string) => {
    navigate('/home', { state: { initialQuery: query } });
  };

  const renderIcon = (iconName: string) => {
    switch (iconName) {
      case 'Fish': return <Fish size={16} />;
      case 'Compass': return <Compass size={16} />;
      case 'Calendar': return <Calendar size={16} />;
      case 'Flag': return <Flag size={16} />;
      case 'ShieldAlert': return <ShieldAlert size={16} />;
      case 'Clock': return <Clock size={16} />;
      case 'Activity': return <Activity size={16} />;
      case 'BarChart2': return <BarChart2 size={16} />;
      case 'FileText': return <FileText size={16} />;
      case 'LifeBuoy': return <LifeBuoy size={16} />;
      case 'Map': return <MapIcon size={16} />;
      case 'Cloud': return <Cloud size={16} />;
      default: return <Zap size={16} />;
    }
  };

  // Profile Card Component
  const ProfileCard = (
    <div key="profile" className="glass-card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--accent-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 'bold' }}>
          {authUser?.name?.charAt(0) || 'U'}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 20, fontWeight: 700 }}>{authUser?.name || 'Guest'}</div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 10px', borderRadius: 99, background: roleConfig.badgeBg, color: roleConfig.badgeColor, fontSize: 12, fontWeight: 600, marginTop: 4 }}>
            {t(roleConfig.displayNameKey as any) || canonicalRole.toUpperCase()}
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 8 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, color: 'var(--text-light)', fontSize: 13, background: 'rgba(255,255,255,0.03)', padding: 12, borderRadius: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600, color: 'var(--text-main)', fontSize: 14, marginBottom: 4 }}>
            <MapPin size={16} color="var(--accent-blue)" />
            {appUser?.locationName || 'Select Location'}
          </div>
          {(appUser as any)?.locationDetails?.district && (
            <div><span style={{ color: 'var(--text-muted)' }}>District:</span> {(appUser as any).locationDetails.district}</div>
          )}
          {(appUser as any)?.locationDetails?.state && (
            <div><span style={{ color: 'var(--text-muted)' }}>State:</span> {(appUser as any).locationDetails.state}</div>
          )}
          {(appUser as any)?.locationDetails?.country && (
            <div><span style={{ color: 'var(--text-muted)' }}>Country:</span> {(appUser as any).locationDetails.country}</div>
          )}
          {appUser?.location && (
            <div><span style={{ color: 'var(--text-muted)' }}>Coordinates:</span> {appUser.location.lat.toFixed(4)}° N, {appUser.location.lon.toFixed(4)}° E</div>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--text-light)', fontSize: 14 }}>
          <ShieldAlert size={18} color="var(--status-go)" />
          {t('dashboard.safetyStatus')}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--text-light)', fontSize: 14 }}>
          <Clock size={18} color="var(--text-muted)" />
          {t('dashboard.lastActive')}
        </div>
      </div>
    </div>
  );

  // Weather Card Component
  const WeatherCardElem = <WeatherCard key="weather" />;

  // Activity Card Component
  const ActivityCard = (
    <div key="activity" className="glass-card" style={{ padding: 24 }}>
      <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
        <Activity size={18} color="var(--text-muted)" /> {t('dashboard.recentActivity')}
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {[
          'Checked sea state & weather conditions',
          'Analyzed marine trip safety parameters',
          'Checked active marine advisories',
          'Inspected coastal boundary clearances'
        ].map((act, i) => (
          <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', marginTop: 6 }} />
            <div style={{ fontSize: 14, color: 'var(--text-light)', lineHeight: 1.5 }}>{act}</div>
          </div>
        ))}
      </div>
    </div>
  );

  // Saved Locations Card Component
  const SavedLocationsCard = (
    <div key="saved" className="glass-card" style={{ padding: 24 }}>
      <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
        <Navigation size={18} color="var(--text-muted)" /> {t('dashboard.savedLocations')}
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {['Chennai Coast (Home)', 'Fishing Zone Alpha (PFZ)', 'Safe Harbor Beta'].map((loc, i) => (
          <div key={i} className="glass" style={{ padding: '12px 16px', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 14, fontWeight: 500 }}>{loc}</span>
            <MapPin size={16} color="var(--text-muted)" />
          </div>
        ))}
      </div>
    </div>
  );

  // Recent Alerts Card Component
  const AlertsCard = (
    <div key="alerts" className="glass-card" style={{ padding: 24, borderTop: '2px solid var(--status-caution)' }}>
      <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
        <ShieldAlert size={18} color="var(--status-caution)" /> {t('dashboard.recentAlerts')}
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {loading ? (
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t('dashboard.loadingAlerts')}</div>
        ) : alerts.length === 0 ? (
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t('dashboard.noAlerts')}</div>
        ) : (
          alerts.slice(0, 3).map(alert => (
            <div key={alert.id} style={{ padding: 12, borderRadius: 10, background: alert.severity === 'HIGH' ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)', border: `1px solid ${alert.severity === 'HIGH' ? 'rgba(239,68,68,0.2)' : 'rgba(245,158,11,0.2)'}` }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: alert.severity === 'HIGH' ? '#f87171' : '#fbbf24' }}>{alert.title}</div>
              <div style={{ fontSize: 12, color: 'var(--text-light)', marginTop: 4 }}>{alert.description}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );

  // Map of available cards
  const cardsMap: Record<string, React.ReactNode> = {
    profile: ProfileCard,
    weather: WeatherCardElem,
    activity: ActivityCard,
    saved: SavedLocationsCard,
    alerts: AlertsCard,
  };

  // Reorder cards based on role priority, placing ProfileCard first followed by prioritized items
  const prioritizedKeys = ['profile', ...roleConfig.dashboardPriority.filter(k => cardsMap[k])];
  const remainingKeys = Object.keys(cardsMap).filter(k => !prioritizedKeys.includes(k));
  const cardOrder = Array.from(new Set([...prioritizedKeys, ...remainingKeys]));

  return (
    <div className="page-shell">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('dashboard.title')}</h1>
          <p className="page-subtitle">{t('dashboard.welcome')} {authUser?.name || 'User'}</p>
        </div>
        
        <div className="glass" style={{ padding: '8px 16px', borderRadius: 99, display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="live-dot" style={{ background: 'var(--status-go)' }} />
          <span style={{ fontSize: 13, fontWeight: 600 }}>{t('dashboard.systemActive')}</span>
        </div>
      </div>

      {/* Role Banner & Recommended Quick Actions */}
      <div className="glass-card" style={{ padding: '18px 24px', marginBottom: 24, borderRadius: 16, borderLeft: `4px solid ${roleConfig.badgeColor}` }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Zap size={20} color={roleConfig.badgeColor} />
            <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: '0.01em' }}>
              Recommended Actions for {t(roleConfig.displayNameKey as any) || canonicalRole.toUpperCase()}
            </span>
          </div>
          <span style={{ fontSize: 12, color: 'var(--text-light)', background: roleConfig.badgeBg, padding: '4px 12px', borderRadius: 99, fontWeight: 600 }}>
            Style: {roleConfig.assistantStyle.toUpperCase()}
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
          {roleConfig.quickActions.slice(0, 4).map(action => (
            <button
              key={action.id}
              onClick={() => handleQuickActionClick(action.query)}
              className="glass"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 14px',
                borderRadius: 10,
                border: '1px solid rgba(255,255,255,0.08)',
                background: 'rgba(255,255,255,0.03)',
                color: 'var(--text-main)',
                fontSize: 13,
                fontWeight: 500,
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = roleConfig.badgeColor)}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)')}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {renderIcon(action.iconName)}
                <span>{action.query.length > 35 ? action.query.slice(0, 32) + '...' : action.query}</span>
              </div>
              <ArrowRight size={14} style={{ opacity: 0.6, flexShrink: 0 }} />
            </button>
          ))}
        </div>
      </div>

      {/* Grid of Dashboard Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
        {cardOrder.map(key => cardsMap[key])}
      </div>
    </div>
  );
}
