'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useNotification } from '@/context/NotificationContext';
import { Home, Mail, Lock, LogIn, Sparkles, Loader2, ArrowLeft, RefreshCw, KeyRound } from 'lucide-react';
import { useFormStore } from '@/lib/formStore';
import Link from 'next/link';


export default function LoginPage() {
  const { login, sendPasswordReset } = useAuth();
  const { showToast } = useNotification();
  const router = useRouter();

  const {
    loginEmail,
    loginPassword,
    loginErrors,
    setLoginEmail,
    setLoginPassword,
    validateLogin,
    clearLoginErrors
  } = useFormStore();

  // State loading cho nút bấm đăng nhập
  const [loading, setLoading] = useState(false);

  // State cho chế độ Quên mật khẩu
  const [isForgotMode, setIsForgotMode] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);

  // Clear errors khi mở trang
  useEffect(() => {
    clearLoginErrors();
  }, []);


  // Xử lý Đăng nhập Email/Password
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate bằng Zustand Store
    const isValid = validateLogin();
    if (!isValid) return;

    try {
      setLoading(true);
      const res = await login(loginEmail, loginPassword);
      if (res.success) {
        showToast('Đăng nhập thành công!', 'success');
        router.push('/');
      } else {
        showToast(res.error || 'Lỗi đăng nhập!', 'error');
      }
    } catch (err) {
      showToast('Có lỗi xảy ra, vui lòng thử lại.', 'error');
    } finally {
      setLoading(false);
    }
  };




  // Xử lý Quên mật khẩu
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) {
      showToast('Vui lòng nhập Email để khôi phục mật khẩu!', 'error');
      return;
    }

    try {
      setForgotLoading(true);
      const res = await sendPasswordReset(forgotEmail);
      if (res.success) {
        showToast('Link đặt lại mật khẩu đã được gửi đến email của bạn!', 'success');
        setIsForgotMode(false);
        setForgotEmail('');
      } else {
        showToast(res.error || 'Lỗi gửi yêu cầu reset mật khẩu!', 'error');
      }
    } catch (err) {
      showToast('Có lỗi xảy ra, vui lòng kiểm tra lại.', 'error');
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Background blobs đồng bộ với hệ thống */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-orange-200/40 rounded-full blur-[100px]"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-red-100/40 rounded-full blur-[100px]"></div>

      {/* Main card */}
      <div className="max-w-5xl w-full bg-white/80 backdrop-blur-md rounded-[2.5rem] border border-slate-200 shadow-2xl flex flex-col md:flex-row overflow-hidden min-h-[600px] animate-in fade-in zoom-in-95 duration-500">
        
        {/* Banner trái */}
        <div className="md:w-1/2 bg-gradient-to-br from-slate-900 via-slate-800 to-orange-950 p-8 md:p-12 flex flex-col justify-between text-white relative">
          {/* Decorative Pattern overlay */}
          <div className="absolute inset-0 bg-[radial-gradient(#ea580c_1px,transparent_1px)] [background-size:24px_24px] opacity-10"></div>
          
          <div className="flex items-center gap-3 relative z-10">
            <div className="bg-orange-600 p-2.5 rounded-xl shadow-lg shadow-orange-500/20">
              <Home className="text-white" size={24} />
            </div>
            <span className="text-xl font-bold">Rentify</span>
          </div>

          <div className="my-auto space-y-4 max-w-sm relative z-10 pt-12 pb-12">
            <span className="text-orange-500 text-xs font-bold uppercase bg-orange-500/10 px-3 py-1 rounded-full border border-orange-500/20 w-fit block">Hệ thống Nội bộ</span>
            <h2 className="text-2xl md:text-3xl font-extrabold leading-tight">Vận hành lưu trú theo tiêu chuẩn 5 sao 🌟</h2>
            <p className="text-slate-400 text-sm leading-relaxed">
              Giải pháp tối ưu lịch đặt phòng, quản lý dòng tiền cọc và tối đa hóa doanh thu cho chuỗi lưu trú cao cấp.
            </p>
          </div>

          <div className="text-xs text-slate-500 relative z-10 flex justify-between">
            <span>© 2026 Rentify Corp.</span>
            <span>Bảo mật hệ thống v2.0</span>
          </div>
        </div>

        {/* Form phải */}
        <div className="md:w-1/2 p-8 md:p-12 flex flex-col justify-center bg-white relative">
          
          {!isForgotMode ? (
            /* --- KHỐI ĐĂNG NHẬP --- */
            <div className="space-y-6 w-full max-w-md mx-auto animate-in slide-in-from-right-4 duration-300">
              <div className="space-y-1.5">
                <h1 className="text-2xl font-bold text-slate-950">Chào mừng trở lại! 👋</h1>
                <p className="text-slate-500 text-sm font-medium">Đăng nhập tài khoản hệ thống của bạn</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase">Email tài khoản</label>
                  <div className="relative group">
                    <Mail className="absolute left-4 top-3.5 text-slate-400 group-focus-within:text-orange-500 transition-colors" size={18} />
                    <input
                      type="email"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      placeholder="nhanvien@congty.com"
                      className={`w-full bg-slate-50 border focus:ring-4 focus:ring-orange-500/5 rounded-2xl py-3 pl-12 pr-4 outline-none text-sm font-semibold text-slate-800 transition-all ${
                        loginErrors.email ? 'border-red-500 focus:border-red-500' : 'border-slate-200 focus:border-orange-500'
                      }`}
                      disabled={loading}
                    />
                  </div>
                  {loginErrors.email && (
                    <p className="text-red-500 text-[11px] font-bold mt-1 animate-in fade-in duration-250 flex items-center gap-1.5">
                      <span className="w-1 h-1 bg-red-500 rounded-full inline-block"></span>
                      {loginErrors.email}
                    </p>
                  )}
                </div>


                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-slate-400 uppercase">Mật khẩu</label>
                    <button
                      type="button"
                      onClick={() => setIsForgotMode(true)}
                      className="text-xs font-bold text-orange-600 hover:text-orange-700 transition-colors"
                    >
                      Quên mật khẩu?
                    </button>
                  </div>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-3.5 text-slate-400 group-focus-within:text-orange-500 transition-colors" size={18} />
                    <input
                      type="password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="••••••••"
                      className={`w-full bg-slate-50 border focus:ring-4 focus:ring-orange-500/5 rounded-2xl py-3 pl-12 pr-4 outline-none text-sm font-semibold text-slate-800 transition-all ${
                        loginErrors.password ? 'border-red-500 focus:border-red-500' : 'border-slate-200 focus:border-orange-500'
                      }`}
                      disabled={loading}
                    />
                  </div>
                  {loginErrors.password && (
                    <p className="text-red-500 text-[11px] font-bold mt-1 animate-in fade-in duration-250 flex items-center gap-1.5">
                      <span className="w-1 h-1 bg-red-500 rounded-full inline-block"></span>
                      {loginErrors.password}
                    </p>
                  )}
                </div>


                <button
                  type="submit"
                  className="w-full bg-slate-900 hover:bg-orange-600 text-white font-bold py-3.5 rounded-2xl transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2 group cursor-pointer text-sm shadow-slate-900/10"
                  disabled={loading}
                >
                  {loading ? (
                    <Loader2 className="animate-spin" size={18} />
                  ) : (
                    <>
                      Đăng nhập <LogIn size={18} className="group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>
              </form>


              <div className="text-center pt-2 bg-slate-55 bg-slate-50 border border-slate-100 rounded-2xl p-3 text-[11px] text-slate-400 font-semibold leading-relaxed">
                Hệ thống nội bộ bảo mật. Nhân viên mới vui lòng liên hệ Quản trị viên (Admin) để được cấp tài khoản truy cập.
              </div>
            </div>
          ) : (
            /* --- KHỐI QUÊN MẬT KHẨU --- */
            <div className="space-y-6 w-full max-w-md mx-auto animate-in slide-in-from-left-4 duration-300">
              <div className="space-y-2">
                <button
                  onClick={() => setIsForgotMode(false)}
                  className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-orange-600 transition-colors w-fit"
                >
                  <ArrowLeft size={14} /> Quay lại đăng nhập
                </button>
                <h1 className="text-2xl font-bold text-slate-950 flex items-center gap-2">
                  <KeyRound size={24} className="text-orange-600" /> Quên mật khẩu?
                </h1>
                <p className="text-slate-500 text-sm leading-relaxed font-medium">
                  Nhập email của bạn dưới đây, chúng tôi sẽ gửi link đặt lại mật khẩu bảo mật vào hòm thư.
                </p>
              </div>

              <form onSubmit={handleForgotPassword} className="space-y-4" noValidate>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase">Email liên kết</label>
                  <div className="relative group">
                    <Mail className="absolute left-4 top-3.5 text-slate-400 group-focus-within:text-orange-500 transition-colors" size={18} />
                    <input
                      type="email"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="nhanvien@congty.com"
                      className="w-full bg-slate-50 border border-slate-200 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/5 rounded-2xl py-3 pl-12 pr-4 outline-none text-sm font-medium text-slate-800 transition-all"
                      disabled={forgotLoading}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-slate-900 hover:bg-orange-600 text-white font-bold py-3.5 rounded-2xl transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2 group cursor-pointer text-sm"
                  disabled={forgotLoading}
                >
                  {forgotLoading ? (
                    <Loader2 className="animate-spin" size={18} />
                  ) : (
                    <>
                      Gửi link khôi phục <RefreshCw size={16} className="group-hover:rotate-45 transition-transform duration-500" />
                    </>
                  )}
                </button>
              </form>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
