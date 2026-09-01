export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
  location?: string;
}

export interface AuthResponse {
  user: AuthUser;
  token: string;
}

const API_URL = '/api/auth';

function unwrapAuthPayload(json: any): any {
  if (json && typeof json === 'object' && json.data && typeof json.data === 'object') {
    return json.data;
  }
  return json;
}

function normalizeAuthResponse(payload: any): AuthResponse {
  const userRaw = payload?.user;
  const token = payload?.token;
  if (!token || !userRaw) {
    throw new Error('Login succeeded but the session payload was incomplete.');
  }

  return {
    token: String(token),
    user: {
      id: String(userRaw.id),
      name: userRaw.name || 'ORCA User',
      email: userRaw.email || '',
      role: userRaw.role || 'Fisherman',
      location: userRaw.location,
    },
  };
}

class AuthService {
  async login(email: string, password: string): Promise<AuthResponse> {
    const res = await fetch(`${API_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password })
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || json.ok === false) {
      throw new Error(json.error || 'Login failed');
    }
    return normalizeAuthResponse(unwrapAuthPayload(json));
  }

  async register(data: any): Promise<AuthResponse> {
    const res = await fetch(`${API_URL}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data)
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || json.ok === false) {
      throw new Error(json.error || 'Registration failed');
    }
    return normalizeAuthResponse(unwrapAuthPayload(json));
  }

  async logout(): Promise<void> {
    await fetch(`${API_URL}/logout`, { method: 'POST', credentials: 'include' });
  }

  async getCurrentUser(token: string): Promise<AuthUser> {
    const res = await fetch(`${API_URL}/me`, {
      headers: { 'Authorization': `Bearer ${token}` },
      credentials: 'include',
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || json.ok === false) {
      throw new Error(json.error || 'Not authenticated');
    }
    const payload = unwrapAuthPayload(json);
    const userRaw = payload.user || payload;
    return {
      id: String(userRaw.id),
      name: userRaw.name || 'ORCA User',
      email: userRaw.email || '',
      role: userRaw.role || 'Fisherman',
      location: userRaw.location,
    };
  }
}

export const authService = new AuthService();
