'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { User } from '@supabase/supabase-js';
import { UserProfile, UserRole } from '@/types';
import { useNotification } from '@/context/NotificationContext';
import { useRouter, usePathname } from 'next/navigation';
import { translateAuthError } from '@/lib/errorTranslator';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  role: UserRole | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  loginWithGoogle: () => Promise<{ success: boolean; error?: string }>;
  register: (email: string, password: string, fullName: string, phone: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  updateProfile: (fullName: string, phone: string) => Promise<{ success: boolean; error?: string }>;
  changePassword: (password: string) => Promise<{ success: boolean; error?: string }>;
  sendPasswordReset: (email: string) => Promise<{ success: boolean; error?: string }>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  
  const { showToast } = useNotification();
  const router = useRouter();
  const pathname = usePathname();

  const fetchProfile = async (uid: string, email: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', uid)
        .single();

      if (error) {
        console.error('[AuthContext] ❌ Lỗi khi fetch profile từ database:', error);
        // Nếu hồ sơ chưa được tạo tự động bởi trigger (do lỗi đồng bộ hoặc tài khoản cũ)
        if (error.code === 'PGRST116') {
          console.log('[AuthContext] ℹ️ Chưa có profile, tiến hành tạo mặc định...');
          // Kiểm tra xem hệ thống có tài khoản nào chưa để xét quyền Admin đầu tiên
          const { count } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
          const isFirstUser = count === 0;

          const defaultProfile = {
            id: uid,
            email,
            full_name: '',
            phone: '',
            role: isFirstUser ? 'admin' : 'pending' as UserRole
          };

          const { data: insertedData } = await supabase
            .from('profiles')
            .insert(defaultProfile)
            .select()
            .single();

          if (insertedData) {
            console.log('[AuthContext] ✅ Tạo profile mặc định thành công:', insertedData);
            return insertedData as UserProfile;
          }
        }
        return null;
      }
      return data as UserProfile;
    } catch (err) {
      console.error('[AuthContext] 💥 Lỗi bắt ngoại lệ fetch profile:', err);
      return null;
    }
  };

  const refreshProfile = async () => {
    if (user) {
      const prof = await fetchProfile(user.id, user.email || '');
      setProfile(prof);
    }
  };

  // Khôi phục session và lắng nghe thay đổi trạng thái đăng nhập (Single Source of Truth)
  useEffect(() => {    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {        
        // Giải mã JWT để xem chi tiết thời gian hết hạn của Access Token
        try {
          const token = session.access_token;
          const parts = token.split('.');
          if (parts.length === 3) {
            const payload = JSON.parse(atob(parts[1]));
            const now = Math.floor(Date.now() / 1000);
          }
        } catch (e) {
          console.error('[AuthContext] Lỗi parse JWT:', e);
        }
      }

      if (session?.user) {
        setUser(session.user);
      } else {
        setUser(null);
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Tải profile người dùng riêng biệt khi trạng thái user thay đổi (Tránh deadlock trong Auth Listener)
  useEffect(() => {
    const loadProfile = async () => {
      if (!user) return;
      
      try {
        const prof = await fetchProfile(user.id, user.email || '');
        setProfile(prof);
      } catch (error) {
        console.error('[AuthContext] ❌ Lỗi khi tải profile của user:', error);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [user]);

  // Bảo vệ Router (Route Guard) client-side
  useEffect(() => {
    if (loading) return;

    const publicPaths = ['/login', '/register'];
    const isPublicPath = publicPaths.includes(pathname);

    if (!user) {
      if (!isPublicPath) {
        router.push('/login');
      }
    } else {
      // Đã đăng nhập
      if (isPublicPath) {
        // Nếu đã đăng nhập mà được duyệt quyền rồi thì cho vào trang chủ
        if (profile && profile.role !== 'pending') {
          router.push('/');
        }
      } else {
        // Đang ở các trang nội bộ, kiểm tra xem tài khoản có bị pending không
        if (profile && profile.role === 'pending' && pathname !== '/pending') {
          router.push('/login'); // Để AuthProvider tự bắt và hiển thị màn hình chờ duyệt ở /login hoặc /register
        }

        // Chặn non-admin vào các trang cấu hình và quản trị nhân sự
        const adminPaths = ['/settings/users'];
        const isSettings = pathname === '/settings';
        // Đối với trang settings thường, non-admin vẫn vào được để chỉnh sửa cá nhân,
        // nhưng chúng ta sẽ ẩn tab Mẫu cọc. Còn các trang quản trị nhân sự thì chặn hoàn toàn.
        if (adminPaths.includes(pathname) && profile?.role !== 'admin') {
          showToast('Bạn không có quyền truy cập trang quản trị này!', 'error');
          router.push('/');
        }
      }
    }
  }, [user, profile, loading, pathname, router]);

  // Đăng nhập bằng Email/Password
  const login = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      return { success: true };
    } catch (err: any) {
      console.error(err);
      return { success: false, error: translateAuthError(err.message) };
    }
  };

  // Đăng nhập bằng Google
  const loginWithGoogle = async () => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/` : undefined,
        }
      });
      if (error) throw error;
      return { success: true };
    } catch (err: any) {
      console.error(err);
      return { success: false, error: translateAuthError(err.message) };
    }
  };

  // Đăng ký tài khoản mới kèm metadata Họ tên & SĐT
  const register = async (email: string, password: string, fullName: string, phone: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            phone: phone,
          }
        }
      });

      if (error) throw error;

      return { success: true };
    } catch (err: any) {
      console.error(err);
      return { success: false, error: translateAuthError(err.message) };
    }
  };

  // Đăng xuất
  const logout = async () => {
    try {
      // Hủy bỏ user state trước để các logic tự động session hết hạn nhận biết user đã chủ động logout
      setUser(null);
      setProfile(null);
      await supabase.auth.signOut();
      showToast('Đăng xuất thành công!');
      router.push('/login');
    } catch (err) {
      console.error(err);
    }
  };

  // Người dùng tự cập nhật thông tin cá nhân
  const updateProfile = async (fullName: string, phone: string) => {
    if (!user) return { success: false, error: 'Chưa đăng nhập.' };
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: fullName, phone: phone })
        .eq('id', user.id);

      if (error) throw error;

      await refreshProfile();
      return { success: true };
    } catch (err: any) {
      console.error(err);
      return { success: false, error: translateAuthError(err.message) };
    }
  };

  // Tự đổi mật khẩu của mình
  const changePassword = async (password: string) => {
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      return { success: true };
    } catch (err: any) {
      console.error(err);
      return { success: false, error: translateAuthError(err.message) };
    }
  };

  // Gửi email khôi phục mật khẩu (Quên mật khẩu)
  const sendPasswordReset = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/settings` : undefined,
      });
      if (error) throw error;
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
        loading,
        login,
        loginWithGoogle,
        register,
        logout,
        updateProfile,
        changePassword,
        sendPasswordReset,
        refreshProfile,
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
