import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import OrcaLogo from '../../components/ui/OrcaLogo';
import { useTranslation } from '../../locales';

export default function Register() {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'Fisherman',
    location: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  
  const { register, isLoading, error, clearError } = useAuthStore();
  const navigate = useNavigate();

  const getPasswordStrength = () => {
    const p = formData.password;
    if (!p) return { label: '', color: 'transparent', width: '0%' };
    if (p.length < 6) return { label: 'Weak', color: '#ef4444', width: '33%' };
    if (p.length >= 8 && /[A-Z]/.test(p) && /[0-9]/.test(p)) return { label: 'Strong', color: '#10b981', width: '100%' };
    return { label: 'Good', color: '#f59e0b', width: '66%' };
  };
  
  const strength = getPasswordStrength();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    if (formData.password !== formData.confirmPassword) {
      alert("Passwords don't match");
      return;
    }
    if (!acceptedTerms) {
      alert("Please accept the terms and conditions");
      return;
    }
    
    try {
      await register(formData);
      navigate('/home');
    } catch (err) {
      // Error handled by store
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="auth-container">
      <div className="glass-card auth-card" style={{ maxWidth: 520, margin: 'auto', marginTop: '40px', marginBottom: '40px' }}>
        <div className="auth-header">
          <OrcaLogo size={42} />
          <h1 className="auth-title">{t('auth.createAccount')}</h1>
          <p className="auth-subtitle">{t('auth.joinNetwork')}</p>
        </div>

        {error && (
          <div style={{ padding: 12, borderRadius: 8, background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5', fontSize: 13, textAlign: 'center' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className="form-group">
              <label className="form-label">{t('auth.fullName')}</label>
              <input type="text" name="name" className="form-input" placeholder="Ramesh K." value={formData.name} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label className="form-label">{t('auth.emailAddress')}</label>
              <input type="email" name="email" className="form-input" placeholder="name@example.com" value={formData.email} onChange={handleChange} required />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className="form-group">
              <label className="form-label">{t('auth.userType')}</label>
              <select name="role" className="form-input" value={formData.role} onChange={handleChange} style={{ appearance: 'none' }}>
                <option value="Fisherman">{t('auth.fisherman')}</option>
                <option value="Marine Researcher">{t('auth.researcher')}</option>
                <option value="Coastal Officer">{t('auth.officer')}</option>
                <option value="General">{t('auth.general')}</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">{t('auth.operatingRegion')}</label>
              <input type="text" name="location" className="form-input" placeholder="e.g. Chennai Coast" value={formData.location} onChange={handleChange} required />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">{t('auth.password')}</label>
            <div className="password-wrapper">
              <input 
                type={showPassword ? 'text' : 'password'} 
                name="password"
                className="form-input" 
                placeholder="••••••••"
                value={formData.password}
                onChange={handleChange}
                required
              />
              <button type="button" className="password-toggle" onClick={() => setShowPassword(!showPassword)}>
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {formData.password && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, paddingLeft: 4 }}>
                <div style={{ flex: 1, height: 4, background: 'rgba(255,255,255,0.1)', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: strength.width, background: strength.color, transition: 'all 0.3s' }} />
                </div>
                <span style={{ fontSize: 11, color: strength.color, width: 40 }}>{strength.label}</span>
              </div>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">{t('auth.confirmPassword')}</label>
            <input type="password" name="confirmPassword" className="form-input" placeholder="••••••••" value={formData.confirmPassword} onChange={handleChange} required />
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginTop: 8 }}>
            <input type="checkbox" id="terms" checked={acceptedTerms} onChange={(e) => setAcceptedTerms(e.target.checked)} style={{ cursor: 'pointer', marginTop: 3 }} />
            <label htmlFor="terms" style={{ fontSize: 13, color: 'var(--text-light)', lineHeight: 1.4 }}>
              {t('auth.termsAgree')}
            </label>
          </div>

          <button type="submit" className="form-button" disabled={isLoading || !acceptedTerms}>
            {isLoading ? <Loader2 size={18} className="spin" /> : t('auth.createAccount')}
          </button>
          
        </form>

        <div style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-light)', marginTop: 4 }}>
          {t('auth.alreadyAccount')} <Link to="/login" className="form-link">{t('auth.logIn')}</Link>
        </div>
      </div>
      
      <style>{`
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { 100% { transform: rotate(360deg); } }
        select option { background: var(--ocean-bg-base); color: white; }
      `}</style>
    </div>
  );
}
