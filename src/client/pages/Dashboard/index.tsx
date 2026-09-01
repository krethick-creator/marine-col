import { useEffect, useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { MapPin, Navigation, Clock, ShieldAlert, Activity, BarChart2, Anchor, Shield, CloudRain, ThermometerSun } from 'lucide-react';
import WeatherCard from '../../components/dashboard/WeatherCard';
import { fetchActiveAlerts } from '../../services/api/alertService';
import type { Alert } from '../../types';
import { useAppStore } from '../../store';
import { roleConfigs } from '../../config/roleConfig';
import type { UserRole } from '../../config/roleConfig';
import { useTranslation, type TranslationKey } from '../../locales';

export default function DashboardPage() {
  const { user: authUser } = useAuthStore();
  const appUser = useAppStore((state) => state.user);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const { t } = useTranslation();

  const role: UserRole = (authUser?.role as UserRole) || 'general';
  const config = roleConfigs[role] || roleConfigs.general;

  useEffect(() => {
    const lat = appUser.location?.lat ?? 13.0827;
    const lon = appUser.location?.lon ?? 80.2707;
    setLoading(true);

    fetchActiveAlerts(lat, lon)
      .then((data) => {
        setAlerts(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [appUser.location?.lat, appUser.location?.lon]);

  const renderFishermanDashboard = () => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
      <ProfileCard authUser={authUser} appUser={appUser} />
      <WeatherCard />
      <RecentAlertsCard alerts={alerts} loading={loading} t={t} />
      <div className="glass-card" style={{ padding: 24 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Anchor size={18} color="var(--accent-blue)" /> Fishing Intelligence
        </h3>
        <div style={{ fontSize: 14, color: 'var(--text-light)', marginBottom: 8 }}>Sea state: Moderate</div>
        <div style={{ fontSize: 14, color: 'var(--text-light)', marginBottom: 16 }}>Return-time recommendation: Before 18:00 IST</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ padding: 12, borderRadius: 10, background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#4ade80' }}>FISHING CONDITIONS: GO</div>
            <div style={{ fontSize: 12, color: 'var(--text-light)', marginTop: 4 }}>Conditions are favorable within 10nm.</div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderResearcherDashboard = () => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
      <ProfileCard authUser={authUser} appUser={appUser} />
      <div className="glass-card" style={{ padding: 24 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <ThermometerSun size={18} color="var(--accent-blue)" /> Ocean Data
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: 'var(--text-light)' }}>
            <span>SST</span><span>28.4°C</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: 'var(--text-light)' }}>
            <span>Chlorophyll-a</span><span>0.72 mg/m³</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: 'var(--text-light)' }}>
            <span>Wave Height</span><span>1.2 m</span>
          </div>
        </div>
      </div>
      <WeatherCard />
      <div className="glass-card" style={{ padding: 24 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <BarChart2 size={18} color="var(--text-muted)" /> Temporal Analysis
        </h3>
        <div style={{ fontSize: 14, color: 'var(--text-light)' }}>NO DATA AVAILABLE</div>
      </div>
    </div>
  );

  const renderCoastalGuardDashboard = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <RecentAlertsCard alerts={alerts} loading={loading} t={t} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
        <div className="glass-card" style={{ padding: 24, borderTop: '2px solid var(--status-nogo)' }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Shield size={18} color="var(--status-nogo)" /> Emergencies & Incidents
          </h3>
          <div style={{ fontSize: 14, color: 'var(--text-light)' }}>NO DATA AVAILABLE</div>
        </div>
        <div className="glass-card" style={{ padding: 24 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <MapPin size={18} color="var(--accent-blue)" /> Restricted / Danger Zones
          </h3>
          <div style={{ fontSize: 14, color: 'var(--text-light)' }}>NO DATA AVAILABLE</div>
        </div>
      </div>
    </div>
  );

  const renderGeneralDashboard = () => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
      <WeatherCard />
      <RecentAlertsCard alerts={alerts} loading={loading} t={t} />
      <ProfileCard authUser={authUser} appUser={appUser} />
    </div>
  );

  return (
    <div className="page-shell">
      <div className="page-header">
        <div>
          <h1 className="page-title">{config.dashboardTitle}</h1>
          <p className="page-subtitle">{config.dashboardSubtitle}</p>
        </div>

        <div className="glass" style={{ padding: '8px 16px', borderRadius: 99, display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="live-dot" style={{ background: 'var(--status-go)' }} />
          <span style={{ fontSize: 13, fontWeight: 600 }}>{t('dashboard.systemActive')}</span>
        </div>
      </div>

      <div style={{ marginBottom: 24, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        {config.quickActions.map((qa) => (
          <div key={qa.label} className="glass-card" style={{ padding: '8px 16px', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: 'var(--accent-blue)' }}>
            {qa.label}
          </div>
        ))}
      </div>

      {role === 'fisherman' && renderFishermanDashboard()}
      {role === 'researcher' && renderResearcherDashboard()}
      {role === 'coastal_guard' && renderCoastalGuardDashboard()}
      {role === 'general' && renderGeneralDashboard()}
    </div>
  );
}

function ProfileCard({ authUser, appUser }: any) {
  return (
    <div className="glass-card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--accent-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 'bold' }}>
          {authUser?.name?.charAt(0) || 'U'}
        </div>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700 }}>{authUser?.name || 'Guest'}</div>
          <div style={{ color: 'var(--text-light)', fontSize: 14, textTransform: 'capitalize' }}>{authUser?.role || 'general'}</div>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 8 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, color: 'var(--text-light)', fontSize: 13, background: 'rgba(255,255,255,0.03)', padding: 12, borderRadius: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600, color: 'var(--text-main)', fontSize: 14, marginBottom: 4 }}>
            <MapPin size={16} color="var(--accent-blue)" />
            {appUser?.locationName || 'Select Location'}
          </div>
          {appUser?.location && (
            <div><span style={{ color: 'var(--text-muted)' }}>Coordinates:</span> {appUser.location.lat.toFixed(4)}° N, {appUser.location.lon.toFixed(4)}° E</div>
          )}
        </div>
      </div>
    </div>
  );
}

function RecentAlertsCard({ alerts, loading, t }: { alerts: Alert[]; loading: boolean; t: (key: TranslationKey) => string }) {
  return (
    <div className="glass-card" style={{ padding: 24, borderTop: '2px solid var(--status-caution)' }}>
      <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
        <ShieldAlert size={18} color="var(--status-caution)" /> {t('dashboard.recentAlerts')}
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {loading ? (
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t('dashboard.loadingAlerts')}</div>
        ) : alerts.length === 0 ? (
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t('dashboard.noAlerts')}</div>
        ) : (
          alerts.slice(0, 3).map((alert: Alert) => (
            <div key={alert.id} style={{ padding: 12, borderRadius: 10, background: alert.severity === 'HIGH' ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)', border: `1px solid ${alert.severity === 'HIGH' ? 'rgba(239,68,68,0.2)' : 'rgba(245,158,11,0.2)'}` }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: alert.severity === 'HIGH' ? '#f87171' : '#fbbf24' }}>{alert.title}</div>
              <div style={{ fontSize: 12, color: 'var(--text-light)', marginTop: 4 }}>{alert.description}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
