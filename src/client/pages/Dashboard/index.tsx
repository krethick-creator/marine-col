import { useEffect, useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { MapPin, Navigation, Clock, ShieldAlert, Activity } from 'lucide-react';
import WeatherCard from '../../components/dashboard/WeatherCard';
import { fetchActiveAlerts } from '../../services/api/alertService';
import type { Alert } from '../../types';

import { useAppStore } from '../../store';

export default function DashboardPage() {
  const { user: authUser } = useAuthStore();
  const appUser = useAppStore(state => state.user);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

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

  return (
    <div className="page-shell">
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Welcome back, {authUser?.name || 'User'}</p>
        </div>
        
        <div className="glass" style={{ padding: '8px 16px', borderRadius: 99, display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="live-dot" style={{ background: 'var(--status-go)' }} />
          <span style={{ fontSize: 13, fontWeight: 600 }}>System Active</span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
        
        {/* Profile Summary Card */}
        <div className="glass-card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--accent-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 'bold' }}>
              {authUser?.name?.charAt(0) || 'U'}
            </div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 700 }}>{authUser?.name || 'Guest'}</div>
              <div style={{ color: 'var(--text-light)', fontSize: 14 }}>{authUser?.role || 'Fisherman'}</div>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--text-light)', fontSize: 14 }}>
              <MapPin size={18} color="var(--accent-blue)" />
              {appUser?.locationName || 'Select Location'}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--text-light)', fontSize: 14 }}>
              <ShieldAlert size={18} color="var(--status-go)" />
              Safety Status: Safe to operate
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--text-light)', fontSize: 14 }}>
              <Clock size={18} color="var(--text-muted)" />
              Last active: Just now
            </div>
          </div>
        </div>

        {/* Independent Weather Card */}
        <WeatherCard />

        {/* Recent Activity */}
        <div className="glass-card" style={{ padding: 24 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Activity size={18} color="var(--text-muted)" /> Recent Activity
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[
              'Checked fishing zones near Chennai Coast',
              'Planned 3-day fishing trip starting tomorrow',
              'Checked marine weather forecast',
              'Viewed boundary information'
            ].map((act, i) => (
              <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', marginTop: 6 }} />
                <div style={{ fontSize: 14, color: 'var(--text-light)', lineHeight: 1.5 }}>{act}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Saved Locations */}
        <div className="glass-card" style={{ padding: 24 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Navigation size={18} color="var(--text-muted)" /> Saved Locations
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

        {/* Recent Alerts */}
        <div className="glass-card" style={{ padding: 24, borderTop: '2px solid var(--status-caution)' }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <ShieldAlert size={18} color="var(--status-caution)" /> Recent Alerts
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {loading ? (
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Loading alerts...</div>
            ) : alerts.length === 0 ? (
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>No active alerts in Chennai region.</div>
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

      </div>
    </div>
  );
}
