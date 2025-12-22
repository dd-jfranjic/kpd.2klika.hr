'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: string;
  organizationId?: string;
  avatarUrl?: string;
  emailVerified: boolean;
}

interface ImpersonationState {
  isImpersonating: boolean;
  originalUser: User | null;
  originalToken: string | null;
  impersonatedAt: string | null;
}

interface GdprConsents {
  termsOfService: boolean;
  privacyPolicy: boolean;
  marketingEmails?: boolean;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, firstName?: string, lastName?: string, consents?: GdprConsents) => Promise<{ requiresVerification: boolean }>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  isAdmin: boolean;
  // Impersonation
  impersonation: ImpersonationState;
  startImpersonation: (userId: string) => Promise<void>;
  stopImpersonation: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api/v1';
const MASTER_ADMIN_EMAILS = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || 'info@2klika.hr').split(',').map(e => e.trim().toLowerCase());

// Token storage helpers
const getStoredToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('kpd_auth_token');
};

const getStoredRefreshToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('kpd_refresh_token');
};

const storeTokens = (accessToken: string, refreshToken?: string) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem('kpd_auth_token', accessToken);
  if (refreshToken) {
    localStorage.setItem('kpd_refresh_token', refreshToken);
  }
  // Also set access token as cookie for middleware
  document.cookie = `kpd_auth_token=${accessToken}; path=/; max-age=${24 * 60 * 60}; SameSite=Lax`;
};

// Legacy support - calls storeTokens
const storeToken = (token: string) => {
  storeTokens(token);
};

const clearToken = () => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('kpd_auth_token');
  localStorage.removeItem('kpd_refresh_token');
  document.cookie = 'kpd_auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
};

// Token refresh interval (12 minutes - token expires in 15)
const TOKEN_REFRESH_INTERVAL = 12 * 60 * 1000;

// Impersonation storage helpers
const IMPERSONATION_KEY = 'kpd_impersonation';

const getImpersonationState = (): ImpersonationState => {
  if (typeof window === 'undefined') {
    return { isImpersonating: false, originalUser: null, originalToken: null, impersonatedAt: null };
  }
  try {
    const stored = localStorage.getItem(IMPERSONATION_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    // Ignore parse errors
  }
  return { isImpersonating: false, originalUser: null, originalToken: null, impersonatedAt: null };
};

const storeImpersonation = (state: ImpersonationState) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(IMPERSONATION_KEY, JSON.stringify(state));
};

const clearImpersonation = () => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(IMPERSONATION_KEY);
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [impersonation, setImpersonation] = useState<ImpersonationState>({
    isImpersonating: false,
    originalUser: null,
    originalToken: null,
    impersonatedAt: null,
  });
  const router = useRouter();

  // Initialize impersonation state from storage
  useEffect(() => {
    const stored = getImpersonationState();
    if (stored.isImpersonating) {
      setImpersonation(stored);
    }
  }, []);

  const checkAuth = useCallback(async () => {
    setLoading(true);
    try {
      const storedToken = getStoredToken();
      if (!storedToken) {
        setUser(null);
        setToken(null);
        setLoading(false);
        return;
      }

      setToken(storedToken);

      // Verify token and get user profile
      const response = await fetch(`${API_BASE}/auth/me`, {
        headers: {
          'Authorization': `Bearer ${storedToken}`,
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        // Map backend response to frontend User interface
        setUser({
          id: data.id,
          email: data.email,
          firstName: data.firstName || undefined,
          lastName: data.lastName || undefined,
          role: data.role,
          organizationId: data.memberships?.[0]?.organization?.id,
          avatarUrl: data.avatarUrl || undefined,
          emailVerified: data.emailVerified,
        });
      } else if (response.status === 401) {
        // Access token expired - try to refresh
        const refreshToken = getStoredRefreshToken();
        if (refreshToken) {
          try {
            const refreshResponse = await fetch(`${API_BASE}/auth/refresh`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({ refreshToken }),
            });

            if (refreshResponse.ok) {
              const refreshData = await refreshResponse.json();
              if (refreshData.accessToken) {
                storeTokens(refreshData.accessToken, refreshData.refreshToken);
                setToken(refreshData.accessToken);

                // Retry getting user profile with new token
                const retryResponse = await fetch(`${API_BASE}/auth/me`, {
                  headers: {
                    'Authorization': `Bearer ${refreshData.accessToken}`,
                    'Content-Type': 'application/json',
                  },
                  credentials: 'include',
                });

                if (retryResponse.ok) {
                  const userData = await retryResponse.json();
                  setUser({
                    id: userData.id,
                    email: userData.email,
                    firstName: userData.firstName || undefined,
                    lastName: userData.lastName || undefined,
                    role: userData.role,
                    organizationId: userData.memberships?.[0]?.organization?.id,
                    avatarUrl: userData.avatarUrl || undefined,
                    emailVerified: userData.emailVerified,
                  });
                  return;
                }
              }
            }
          } catch (refreshError) {
            console.error('Token refresh during checkAuth failed:', refreshError);
          }
        }

        // Refresh failed or no refresh token - clear everything
        clearToken();
        setUser(null);
        setToken(null);
      } else {
        // Other error - clear tokens
        clearToken();
        setUser(null);
        setToken(null);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      clearToken();
      setUser(null);
      setToken(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Function to refresh access token using refresh token
  const refreshAccessToken = useCallback(async (): Promise<boolean> => {
    const refreshToken = getStoredRefreshToken();
    if (!refreshToken) {
      return false;
    }

    try {
      const response = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ refreshToken }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.accessToken) {
          storeTokens(data.accessToken, data.refreshToken);
          setToken(data.accessToken);
          return true;
        }
      }

      // Refresh failed - clear tokens and logout
      clearToken();
      setUser(null);
      setToken(null);
      return false;
    } catch (error) {
      console.error('Token refresh failed:', error);
      return false;
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Set up automatic token refresh interval
  useEffect(() => {
    if (!token || !user) return;

    // Refresh token periodically (every 12 minutes)
    const intervalId = setInterval(async () => {
      const success = await refreshAccessToken();
      if (!success && user) {
        // Refresh failed - user will be logged out automatically
        console.log('Session expired, logging out...');
      }
    }, TOKEN_REFRESH_INTERVAL);

    return () => clearInterval(intervalId);
  }, [token, user, refreshAccessToken]);

  // Redirect based on role (but NOT when impersonating)
  useEffect(() => {
    if (!loading && user && !impersonation.isImpersonating) {
      const isAdmin = MASTER_ADMIN_EMAILS.includes(user.email.toLowerCase());
      const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';

      if (isAdmin && currentPath === '/dashboard') {
        router.push('/admin');
      }
    }
  }, [user, loading, router, impersonation.isImpersonating]);

  const login = async (email: string, password: string) => {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Neispravni podaci za prijavu');
    }

    const data = await response.json();

    if (data.accessToken) {
      // Store both access token and refresh token
      storeTokens(data.accessToken, data.refreshToken);
      setToken(data.accessToken);
    }

    // Map backend response to frontend User interface
    setUser({
      id: data.user.id,
      email: data.user.email,
      firstName: data.user.firstName || undefined,
      lastName: data.user.lastName || undefined,
      role: data.user.role,
      organizationId: data.organization?.id,
      avatarUrl: undefined,
      emailVerified: false, // Will be updated on profile refresh
    });

    // Redirect based on role
    const isAdmin = MASTER_ADMIN_EMAILS.includes(data.user.email.toLowerCase());
    if (isAdmin) {
      router.push('/admin');
    } else {
      router.push('/dashboard');
    }
  };

  const register = async (email: string, password: string, firstName?: string, lastName?: string, consents?: GdprConsents) => {
    const response = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        email,
        password,
        firstName,
        lastName,
        // GDPR consents - backend requires these for compliance
        termsOfService: consents?.termsOfService ?? false,
        privacyPolicy: consents?.privacyPolicy ?? false,
        marketingEmails: consents?.marketingEmails,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Registracija nije uspjela');
    }

    const data = await response.json();

    // If email verification is required
    if (data.requiresVerification) {
      return { requiresVerification: true };
    }

    // If auto-login after registration
    if (data.accessToken) {
      // Store both access token and refresh token
      storeTokens(data.accessToken, data.refreshToken);
      setToken(data.accessToken);
      // Map backend response to frontend User interface
      setUser({
        id: data.user.id,
        email: data.user.email,
        firstName: data.user.firstName || undefined,
        lastName: data.user.lastName || undefined,
        role: data.user.role,
        organizationId: data.organization?.id,
        avatarUrl: undefined,
        emailVerified: false,
      });
      router.push('/dashboard');
    }

    return { requiresVerification: false };
  };

  // Impersonation functions
  const startImpersonation = async (userId: string) => {
    if (!token || !user) return;

    try {
      // Call backend to get impersonation token
      const response = await fetch(`${API_BASE}/admin/users/${userId}/impersonate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Impersonacija nije uspjela');
      }

      const data = await response.json();

      // Store original user and token before switching
      const impersonationState: ImpersonationState = {
        isImpersonating: true,
        originalUser: user,
        originalToken: token,
        impersonatedAt: new Date().toISOString(),
      };

      storeImpersonation(impersonationState);
      setImpersonation(impersonationState);

      // Switch to impersonated user's token
      if (data.accessToken) {
        storeToken(data.accessToken);
        setToken(data.accessToken);
      }

      // Set impersonated user data
      setUser({
        id: data.user.id,
        email: data.user.email,
        firstName: data.user.firstName || undefined,
        lastName: data.user.lastName || undefined,
        role: data.user.role,
        organizationId: data.user.organizationId,
        avatarUrl: data.user.avatarUrl || undefined,
        emailVerified: data.user.emailVerified || false,
      });

      // Navigate to dashboard as impersonated user
      router.push('/dashboard');
    } catch (error) {
      console.error('Impersonation failed:', error);
      throw error;
    }
  };

  const stopImpersonation = () => {
    const { originalUser, originalToken } = impersonation;

    if (originalUser && originalToken) {
      // Restore original user and token
      storeToken(originalToken);
      setToken(originalToken);
      setUser(originalUser);
    }

    // Clear impersonation state
    clearImpersonation();
    setImpersonation({
      isImpersonating: false,
      originalUser: null,
      originalToken: null,
      impersonatedAt: null,
    });

    // Force full page reload to ensure state is properly refreshed
    // router.push doesn't work well here because React state needs full refresh
    window.location.href = '/admin/users';
  };

  const logout = async () => {
    try {
      const currentToken = getStoredToken();
      const refreshToken = getStoredRefreshToken();
      if (currentToken) {
        await fetch(`${API_BASE}/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${currentToken}`,
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({ refreshToken }),
        });
      }
    } catch (error) {
      // Ignore logout errors
    }

    clearToken();
    setUser(null);
    setToken(null);
    router.push('/');
  };

  const refreshUser = async () => {
    const currentToken = getStoredToken();
    if (!currentToken) return;

    const response = await fetch(`${API_BASE}/auth/me`, {
      headers: {
        'Authorization': `Bearer ${currentToken}`,
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    if (response.ok) {
      const data = await response.json();
      setUser({
        id: data.id,
        email: data.email,
        firstName: data.firstName || undefined,
        lastName: data.lastName || undefined,
        role: data.role,
        organizationId: data.memberships?.[0]?.organization?.id,
        avatarUrl: data.avatarUrl || undefined,
        emailVerified: data.emailVerified,
      });
    }
  };

  const isAdmin = user ? MASTER_ADMIN_EMAILS.includes(user.email.toLowerCase()) : false;

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        token,
        login,
        register,
        logout,
        refreshUser,
        isAdmin,
        impersonation,
        startImpersonation,
        stopImpersonation,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Helper hook for getting token (compatibility with old code)
export function useAuthToken() {
  const { token } = useAuth();
  const getToken = useCallback(async () => token, [token]);
  return { getToken };
}
