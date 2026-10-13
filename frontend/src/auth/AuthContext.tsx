import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { authApi, type AuthUser } from './api';

const TOKEN_KEY = 'myspace.auth.token.v1';
const REFRESH_TOKEN_KEY = 'myspace.auth.refresh.v1';

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<boolean>;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function persistSession(accessToken: string, refreshToken: string | null) {
  localStorage.setItem(TOKEN_KEY, accessToken);
  if (refreshToken) localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  else localStorage.removeItem(REFRESH_TOKEN_KEY);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let current = true;

    async function restoreSession() {
      try {
        // Supabase returns a confirmed signup session in the URL fragment.
        const callbackParams = new URLSearchParams(window.location.hash.slice(1));
        const callbackAccessToken = callbackParams.get('access_token');
        const callbackRefreshToken = callbackParams.get('refresh_token');
        if (callbackAccessToken) {
          window.history.replaceState(window.history.state, '', `${window.location.pathname}${window.location.search}`);
          const callbackUser = await authApi.me(callbackAccessToken);
          if (!current) return;
          persistSession(callbackAccessToken, callbackRefreshToken);
          setUser(callbackUser);
          return;
        }

        const accessToken = localStorage.getItem(TOKEN_KEY);
        const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
        if (accessToken) {
          try {
            const authenticatedUser = await authApi.me(accessToken);
            if (current) setUser(authenticatedUser);
            return;
          } catch {
            // Refresh the access token below if it expired.
          }
        }

        if (!refreshToken) throw new Error('No valid session remains.');
        const refreshed = await authApi.refresh(refreshToken);
        if (!refreshed.access_token) throw new Error('Session refresh failed.');
        persistSession(refreshed.access_token, refreshed.refresh_token);
        const authenticatedUser = await authApi.me(refreshed.access_token);
        if (current) setUser(authenticatedUser);
      } catch {
        if (current) {
          localStorage.removeItem(TOKEN_KEY);
          localStorage.removeItem(REFRESH_TOKEN_KEY);
          setUser(null);
        }
      } finally {
        if (current) setIsLoading(false);
      }
    }

    void restoreSession();
    return () => { current = false; };
  }, []);

  const acceptSession = useCallback(async (request: Promise<Awaited<ReturnType<typeof authApi.login>>>) => {
    const result = await request;
    if (!result.access_token) return false;
    persistSession(result.access_token, result.refresh_token);
    setUser(result.user);
    return true;
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const authenticated = await acceptSession(authApi.login(email.trim(), password));
    if (!authenticated) throw new Error('Sign in did not return an access token.');
  }, [acceptSession]);

  const signUp = useCallback((email: string, password: string) =>
    acceptSession(authApi.register(email.trim(), password)), [acceptSession]);

  const signOut = useCallback(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    setUser(null);
    if (token) void authApi.logout(token).catch(() => undefined);
  }, []);

  const value = useMemo(() => ({ user, isLoading, signIn, signUp, signOut }), [user, isLoading, signIn, signUp, signOut]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
