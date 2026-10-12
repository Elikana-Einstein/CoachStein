import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { authApi, type AuthUser } from './api';

const TOKEN_KEY = 'myspace.auth.token.v1';

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      setIsLoading(false);
      return;
    }

    let current = true;
    authApi.me(token)
      .then((authenticatedUser) => {
        if (current) setUser(authenticatedUser);
      })
      .catch(() => {
        localStorage.removeItem(TOKEN_KEY);
        if (current) setUser(null);
      })
      .finally(() => {
        if (current) setIsLoading(false);
      });

    return () => { current = false; };
  }, []);

  const acceptToken = useCallback(async (request: Promise<Awaited<ReturnType<typeof authApi.login>>>) => {
    const result = await request;
    localStorage.setItem(TOKEN_KEY, result.access_token);
    setUser(result.user);
  }, []);

  const signIn = useCallback((email: string, password: string) =>
    acceptToken(authApi.login(email.trim(), password)), [acceptToken]);
  const signUp = useCallback((email: string, password: string) =>
    acceptToken(authApi.register(email.trim(), password)), [acceptToken]);

  const signOut = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
  }, []);

  const value = useMemo(() => ({ user, isLoading, signIn, signUp, signOut }), [user, isLoading, signIn, signUp, signOut]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
