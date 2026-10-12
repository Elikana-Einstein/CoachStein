export interface AuthUser {
  id: number;
  email: string;
}

export interface AuthToken {
  access_token: string;
  token_type: 'bearer';
  expires_in: number;
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
  me: (token: string) => request<AuthUser>('/auth/me', {
    headers: { Authorization: `Bearer ${token}` },
  }),
};
