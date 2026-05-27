'use client';

import React from 'react';
import Sidebar from '@/components/Sidebar/Sidebar';
import MobileNav from '@/components/MobileNav/MobileNav';
import { useAuth } from '@/context/AuthContext';
import { usePathname } from 'next/navigation';
import { Loader2, LogOut, ShieldAlert, Sparkles, UserCheck } from 'lucide-react';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, profile, role, loading, logout } = useAuth();
  const pathname = usePathname();

  const isPublicPage = ['/login', '/register'].includes(pathname);

  // 1. Giao diện Loading khởi động
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center relative overflow-hidden">
        {/* Điểm nhấn nền Gradient */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-orange-200/30 rounded-full blur-[100px] animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-red-100/30 rounded-full blur-[100px] animate-pulse delay-700"></div>
        
        <div className="relative z-10 flex flex-col items-center gap-6">
          <div className="p-4 bg-white border border-slate-200/80 rounded-3xl shadow-xl relative group">
            <div className="absolute inset-0 bg-gradient-to-tr from-orange-500 to-red-500 rounded-3xl blur opacity-10 group-hover:opacity-20 transition-opacity"></div>
            <Loader2 className="text-orange-500 animate-spin relative z-10" size={48} />
          </div>
          <div className="text-center space-y-2">
            <h2 className="text-slate-900 font-extrabold text-lg flex items-center gap-2 justify-center">
              Rentify <Sparkles size={16} className="text-orange-500 animate-bounce" />
            </h2>
            <p className="text-slate-400 text-xs font-medium">Đang tải dữ liệu...</p>
          </div>
        </div>
      </div>
    );
  }

  // 2. Nếu chưa đăng nhập hoặc đang ở trang công khai
  if (!user || isPublicPage) {
    return <>{children}</>;
  }

  // 3. Nếu tài khoản chưa được duyệt (Pending)
  if (profile && role === 'pending') {
    return (
      <div className="min-h-screen bg-[#0b0f19] flex items-center justify-center p-4 relative overflow-hidden text-slate-100">
        {/* Background glow effects */}
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-orange-600/10 rounded-full blur-[120px]"></div>
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-indigo-600/10 rounded-full blur-[120px]"></div>

        <div className="max-w-md w-full bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 shadow-2xl text-center space-y-8 relative z-10">
          <div className="mx-auto w-20 h-20 bg-orange-500/10 rounded-2xl flex items-center justify-center border border-orange-500/20 relative group">
            <div className="absolute inset-0 bg-orange-500/20 rounded-2xl blur-md opacity-50 group-hover:opacity-100 transition-opacity"></div>
            <ShieldAlert className="text-orange-500 relative z-10 animate-pulse" size={40} />
          </div>

          <div className="space-y-3">
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white">Đăng ký thành công!</h1>
            <p className="text-orange-500 font-semibold text-sm">Tài khoản của bạn đang chờ phê duyệt</p>
            <p className="text-slate-400 text-xs leading-relaxed px-2">
              Để bảo mật thông tin nội bộ của công ty, tài khoản mới đăng ký cần được Quản trị viên (Admin) duyệt quyền truy cập trước khi sử dụng.
            </p>
          </div>

          {/* User information panel */}
          <div className="bg-slate-950/50 border border-slate-800/80 rounded-2xl p-4 text-left space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500 font-medium">Họ tên:</span>
              <span className="text-slate-300 font-semibold">{profile.full_name || 'Chưa cập nhật'}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500 font-medium">Số điện thoại:</span>
              <span className="text-slate-300 font-semibold">{profile.phone || 'Chưa cập nhật'}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500 font-medium">Email hệ thống:</span>
              <span className="text-slate-300 font-semibold truncate max-w-[200px]">{profile.email}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500 font-medium">Quyền hạn:</span>
              <span className="text-orange-400 font-bold uppercase bg-orange-500/10 px-2 py-0.5 rounded text-[10px] border border-orange-500/20">Chờ kích hoạt</span>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800 flex flex-col gap-3">
            <div className="text-[11px] text-slate-500 font-semibold flex items-center justify-center gap-1.5">
              <UserCheck size={12} className="text-emerald-500" /> Vui lòng báo cho Admin duyệt tài khoản này.
            </div>
            <button
              onClick={() => logout()}
              className="flex items-center justify-center gap-2 w-full py-3 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-xl font-bold transition-all border border-red-500/20 hover:border-red-500 active:scale-95 text-sm"
            >
              <LogOut size={16} /> Đăng xuất & Đăng nhập tài khoản khác
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 4. Nếu tài khoản đã được phê duyệt (Admin hoặc Staff)
  return (
    <div className="flex flex-col xl:flex-row min-h-screen">
      <Sidebar />
      <MobileNav />
      <main className="flex-1 xl:ml-64 min-h-screen p-4 md:p-8 pb-24 xl:pb-8 bg-[#f8fafc] text-gray-900 overflow-y-auto">
        <div className="max-w-[1600px] mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
