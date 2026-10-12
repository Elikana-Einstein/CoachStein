export interface AuthUser {
  id: string;
  email: string;
}

export interface AuthToken {
  access_token: string | null;
  refresh_token: string | null;
  token_type: 'bearer';
  expires_in: number | null;
  user: AuthUser;
}

const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');
const API_PREFIX = '/api/v1';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${API_PREFIX}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...init?.headers,
      },
    });
  } catch {
    throw new Error('Could not reach the API. Make sure the backend is running.');
  }

  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { detail?: unknown } | null;
    const detail = payload?.detail;
    const message = typeof detail === 'string'
      ? detail
      : Array.isArray(detail)
        ? detail.map((issue) => typeof issue === 'object' && issue && 'msg' in issue ? String(issue.msg) : '').filter(Boolean).join(' ')
        : 'Something went wrong. Please try again.';
    throw new Error(message || 'Please check the information and try again.');
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export const authApi = {
  register: (email: string, password: string) => request<AuthToken>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  }),
  login: (email: string, password: string) => request<AuthToken>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  }),
  refresh: (refreshToken: string) => request<AuthToken>('/auth/refresh', {
    method: 'POST',
    body: JSON.stringify({ refresh_token: refreshToken }),
  }),
  logout: (token: string) => request<void>('/auth/logout', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  }),
  me: (token: string) => request<AuthUser>('/auth/me', {
    headers: { Authorization: `Bearer ${token}` },
  }),
  dashboard: (token: string) => request<{ roadmap: import('../data/roadmap').Roadmap; progress: import('../data/roadmap').Progress }>('/dashboard', {
    headers: { Authorization: `Bearer ${token}` },
  }),
  saveDashboard: (token: string, data: { roadmap: import('../data/roadmap').Roadmap; progress: import('../data/roadmap').Progress }) => request<{ roadmap: import('../data/roadmap').Roadmap; progress: import('../data/roadmap').Progress }>('/dashboard', {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  }),
};

export function getAccessToken(): string | null {
  return localStorage.getItem('myspace.auth.token.v1');
}
