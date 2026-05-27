'use client';

import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { UserProfile, UserRole } from '@/types';
import { useNotification } from '@/context/NotificationContext';
import { useRouter, usePathname } from 'next/navigation';
import { translateAuthError } from '@/lib/errorTranslator';

// Helper: decode JWT payload (client-side only)
const decodeToken = (token: string): { userId: string; role?: string; tenantId?: string; exp?: number } | null => {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1]));
    return {
      userId: payload.userId,
      role: payload.role,
      tenantId: payload.tenantId,
      exp: payload.exp,
    };
  } catch {
    return null;
  }
};

// Helper: check if token is expired
const isTokenExpired = (token: string): boolean => {
  const decoded = decodeToken(token);
  if (!decoded?.exp) return true;
  return Date.now() >= decoded.exp * 1000;
};

// Helper: get auth headers for API calls
export const getAuthHeaders = (): HeadersInit => {
  if (typeof window === 'undefined') return {};
  const token = localStorage.getItem('rentify_token');
  if (!token) return {};
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
};

// Helper: authenticated fetch
export const authFetch = async (url: string, options: RequestInit = {}): Promise<Response> => {
  const headers = {
    ...getAuthHeaders(),
    ...(options.headers || {}),
  } as Record<string, string>;

  // Ensure Content-Type for POST/PATCH/PUT with body
  if (options.body && !(options.body instanceof FormData)) {
    headers['Content-Type'] = headers['Content-Type'] || 'application/json';
  }

  return fetch(url, {
    ...options,
    headers,
  });
};

// Helper: get current token
export const getToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('rentify_token');
};

interface AuthContextType {
  user: { id: string; email: string } | null;
  profile: UserProfile | null;
  role: UserRole | null;
  startupName: string | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (email: string, password: string, fullName: string, phone: string) => Promise<{ success: boolean; error?: string }>;
  registerStartup: (
    email: string,
    password: string,
    fullName: string,
    phone: string,
    startupName: string,
    businessType: string,
    activationCode?: string
  ) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  updateProfile: (fullName: string, phone: string) => Promise<{ success: boolean; error?: string }>;
  changePassword: (password: string) => Promise<{ success: boolean; error?: string }>;
  sendPasswordReset: (email: string) => Promise<{ success: boolean; error?: string }>;
  refreshProfile: () => Promise<void>;
  refreshStartup: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<{ id: string; email: string } | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [startupName, setStartupName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const { showToast } = useNotification();
  const router = useRouter();
  const pathname = usePathname();

  // Restore session from localStorage on mount
  useEffect(() => {
    const savedToken = localStorage.getItem('rentify_token');
    if (savedToken && !isTokenExpired(savedToken)) {
      setToken(savedToken);
      const decoded = decodeToken(savedToken);
      if (decoded) {
        setUser({ id: decoded.userId, email: '' });
      }
    } else {
      localStorage.removeItem('rentify_token');
      setLoading(false);
    }
  }, []);

  // Fetch profile when user/token changes
  const fetchProfile = async (userId: string, email: string): Promise<UserProfile | null> => {
    try {
      // Try to get profile from our own API
      const response = await authFetch('/api/profile');

      if (response.ok) {
        const data = await response.json();
        if (data.profile) return data.profile as UserProfile;
      }

      // If 401, token might have expired
      if (response.status === 401) {
        localStorage.removeItem('rentify_token');
        setToken(null);
        setUser(null);
        return null;
      }

      // For new users, profile might not exist yet
      // Fallback: use decoded token info to create a minimal profile
      const savedToken = localStorage.getItem('rentify_token');
      if (savedToken) {
        const decoded = decodeToken(savedToken);
        if (decoded) {
          const minimalProfile: UserProfile = {
            id: userId,
            email,
            full_name: '',
            phone: '',
            role: (decoded.role as UserRole) || 'pending',
            tenant_id: decoded.tenantId,
            created_at: new Date().toISOString(),
          };
          return minimalProfile;
        }
      }

      return null;
    } catch (err) {
      console.error('[AuthContext] 💥 fetchProfile error:', err);
      return null;
    }
  };

  const fetchStartupName = async (tenantId: string): Promise<string | null> => {
    try {
      const response = await authFetch(`/api/tenants/${tenantId}`);
      if (response.ok) {
        const data = await response.json();
        return data.name || null;
      }
      return null;
    } catch (err) {
      console.error('[AuthContext] 💥 fetchStartupName error:', err);
      return null;
    }
  };

  const refreshProfile = async () => {
    if (!token || !user) return;
    const prof = await fetchProfile(user.id, user.email);
    setProfile(prof);

    if (prof?.tenant_id) {
      const name = await fetchStartupName(prof.tenant_id);
      setStartupName(name);
    } else {
      setStartupName(null);
    }
  };

  const refreshStartup = async () => {
    if (!profile?.tenant_id) {
      setStartupName(null);
      return;
    }
    const name = await fetchStartupName(profile.tenant_id);
    setStartupName(name);
  };

  // Load profile when user is set
  useEffect(() => {
    if (!user || !token) return;

    const loadProfile = async () => {
      try {
        const prof = await fetchProfile(user.id, user.email);
        setProfile(prof);

        if (prof?.tenant_id) {
          const name = await fetchStartupName(prof.tenant_id);
          setStartupName(name);
        } else {
          setStartupName(null);
        }
      } catch (error) {
        console.error('[AuthContext] ❌ Error loading profile:', error);
        showToast('Không thể tải hồ sơ người dùng. Vui lòng thử lại.', 'error');
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [user, token]);

  // Route guard
  useEffect(() => {
    if (loading) return;

    const publicPaths = ['/login', '/register', '/register-startup', '/reset-password'];
    const isPublicPath = publicPaths.includes(pathname);

    if (!user) {
      if (!isPublicPath) {
        router.push('/login');
      }
    } else {
      if (isPublicPath) {
        if (pathname === '/reset-password') return;
        if (profile && profile.role !== 'pending' && profile.role !== 'pending_owner') {
          router.push('/');
        }
      } else {
        if (profile && profile.role === 'pending' && pathname !== '/pending') {
          router.push('/login');
        }

        const isProtectedAdminPath = pathname.startsWith('/settings/users') || pathname.startsWith('/villas/edit');
        if (isProtectedAdminPath && profile?.role !== 'admin' && profile?.role !== 'owner') {
          showToast('Bạn không có quyền truy cập trang quản trị này!', 'error');
          router.push('/');
        }
      }
    }
  }, [user, profile, loading, pathname, router]);

  // Login
  const login = async (email: string, password: string) => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const result = await response.json();
      if (!response.ok) {
        return { success: false, error: translateAuthError(result.error) };
      }

      // Store token
      localStorage.setItem('rentify_token', result.token);
      setToken(result.token);
      setUser({ id: result.user.id, email: result.user.email });

      // Fetch profile after login
      const prof = await fetchProfile(result.user.id, result.user.email);
      setProfile(prof);

      if (prof?.tenant_id) {
        const name = await fetchStartupName(prof.tenant_id);
        setStartupName(name);
      }

      return { success: true };
    } catch (err: any) {
      console.error(err);
      return { success: false, error: translateAuthError(err.message) };
    }
  };

  // Register (normal user)
  const register = async (email: string, password: string, fullName: string, phone: string) => {
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, fullName, phone }),
      });

      const result = await response.json();
      if (!response.ok) {
        return { success: false, error: translateAuthError(result.error) };
      }

      // Store token
      localStorage.setItem('rentify_token', result.token);
      setToken(result.token);
      setUser({ id: result.user.id, email: result.user.email });

      const prof = await fetchProfile(result.user.id, result.user.email);
      setProfile(prof);

      return { success: true };
    } catch (err: any) {
      console.error(err);
      return { success: false, error: translateAuthError(err.message) };
    }
  };

  // Register Startup
  const registerStartup = async (
    email: string,
    password: string,
    fullName: string,
    phone: string,
    startupName: string,
    businessType: string,
    activationCode?: string
  ) => {
    try {
      const response = await fetch('/api/auth/register-startup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          fullName,
          phone,
          startupName,
          businessType,
          activationCode,
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        return { success: false, error: translateAuthError(result.error) };
      }

      return { success: true };
    } catch (err: any) {
      console.error('[AuthContext] Lỗi đăng ký Startup:', err);
      return { success: false, error: translateAuthError(err.message) };
    }
  };

  // Logout
  const logout = async () => {
    localStorage.removeItem('rentify_token');
    setUser(null);
    setProfile(null);
    setToken(null);
    setStartupName(null);
    router.replace('/login');
    showToast('Đăng xuất thành công!');
  };

  // Update profile
  const updateProfile = async (fullName: string, phone: string) => {
    if (!user) return { success: false, error: 'Chưa đăng nhập.' };
    try {
      const response = await authFetch('/api/profile', {
        method: 'PATCH',
        body: JSON.stringify({ fullName, phone }),
      });

      if (!response.ok) {
        const result = await response.json();
        return { success: false, error: result.error || 'Không thể cập nhật hồ sơ.' };
      }

      await refreshProfile();
      return { success: true };
    } catch (err: any) {
      console.error(err);
      return { success: false, error: translateAuthError(err.message) };
    }
  };

  // Change password
  const changePassword = async (password: string) => {
    try {
      const response = await authFetch('/api/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ password }),
      });

      if (!response.ok) {
        const result = await response.json();
        return { success: false, error: result.error || 'Không thể đổi mật khẩu.' };
      }

      return { success: true };
    } catch (err: any) {
      console.error(err);
      return { success: false, error: translateAuthError(err.message) };
    }
  };

  // Password reset (send email - we use a simple API for now)
  const sendPasswordReset = async (email: string) => {
    try {
      const response = await fetch('/api/auth/reset-password-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        const result = await response.json();
        return { success: false, error: result.error || 'Không thể gửi yêu cầu đặt lại mật khẩu.' };
      }

      return { success: true };
    } catch (err: any) {
      console.error(err);
      return { success: false, error: translateAuthError(err.message) };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        role: profile ? profile.role : null,
        startupName,
        token,
        loading,
        login,
        register,
        registerStartup,
        logout,
        updateProfile,
        changePassword,
        sendPasswordReset,
        refreshProfile,
        refreshStartup,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth phải được dùng trong AuthProvider');
  }
  return context;
};