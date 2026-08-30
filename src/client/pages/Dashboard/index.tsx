import { useAuthStore } from '../../store/authStore';
import { MapPin, Navigation, Clock, ShieldAlert, Activity } from 'lucide-react';
import WeatherCard from '../../components/dashboard/WeatherCard';

export default function DashboardPage() {
  const { user } = useAuthStore();

  return (
    <div className="page-shell">
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Welcome back, {user?.name || 'User'}</p>
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
              {user?.name?.charAt(0) || 'U'}
            </div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 700 }}>{user?.name || 'Guest'}</div>
              <div style={{ color: 'var(--text-light)', fontSize: 14 }}>{user?.role || 'Fisherman'}</div>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--text-light)', fontSize: 14 }}>
              <MapPin size={18} color="var(--accent-blue)" />
              {user?.location || 'Unknown Location'}
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
            <div style={{ padding: 12, borderRadius: 10, background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)' }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#fbbf24' }}>Marine Weather Alert</div>
              <div style={{ fontSize: 12, color: 'var(--text-light)', marginTop: 4 }}>High waves expected (2.5m) in 48 hours.</div>
            </div>
            <div style={{ padding: 12, borderRadius: 10, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#f87171' }}>Boundary Warning</div>
              <div style={{ fontSize: 12, color: 'var(--text-light)', marginTop: 4 }}>Saved trip approaches 5nm buffer zone.</div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
