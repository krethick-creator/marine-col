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

// Prepare backend REST endpoints for later integration
const API_URL = '/api/auth';

/**
 * Clean mock authentication service.
 * Can be swapped for real fetch/axios calls to the Node.js backend later.
 */
class AuthService {
  private isMock = false;

  async login(email: string, password: string):Promise<AuthResponse> {
    if (this.isMock) {
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 800));
      
      if (email === 'demo@orca.gov' && password === 'orca2026') {
        return {
          user: {
            id: 'u-1',
            name: 'Ramesh K.',
            email: 'demo@orca.gov',
            role: 'Fisherman',
            location: 'Chennai Coast'
          },
          token: 'mock-jwt-token-abc123'
        };
      }
      throw new Error('Invalid email or password. (Hint: demo@orca.gov / orca2026)');
    }
    
    const res = await fetch(`${API_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    if (!res.ok) throw new Error('Login failed');
    return res.json();
  }

  async register(data: any):Promise<AuthResponse> {
    if (this.isMock) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      return {
        user: {
          id: 'u-2',
          name: data.name,
          email: data.email,
          role: data.role,
          location: data.location
        },
        token: 'mock-jwt-token-newuser'
      };
    }

    const res = await fetch(`${API_URL}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Registration failed');
    return res.json();
  }

  async logout():Promise<void> {
    if (this.isMock) {
      await new Promise(resolve => setTimeout(resolve, 300));
      return;
    }
    await fetch(`${API_URL}/logout`, { method: 'POST' });
  }

  async getCurrentUser(token: string):Promise<AuthUser> {
    if (this.isMock) {
      await new Promise(resolve => setTimeout(resolve, 300));
      if (token.includes('mock')) {
        return {
          id: 'u-1',
          name: 'Ramesh K.',
          email: 'demo@orca.gov',
          role: 'Fisherman',
          location: 'Chennai Coast'
        };
      }
      throw new Error('Invalid token');
    }

    const res = await fetch(`${API_URL}/me`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('Not authenticated');
    return res.json();
  }
}

export const authService = new AuthService();
