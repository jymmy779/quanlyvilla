'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useNotification } from '@/context/NotificationContext';
import { Home, Mail, Lock, User, Phone, Sparkles, Loader2, ArrowLeft, Building2, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';

export default function RegisterStartupPage() {
  const { registerStartup } = useAuth();
  const { showToast } = useNotification();
  const router = useRouter();

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [startupName, setStartupName] = useState('');
  const [businessType, setBusinessType] = useState('homestay');
  const [activationCode, setActivationCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const validateForm = () => {
    const tempErrors: { [key: string]: string } = {};
    if (!email) tempErrors.email = 'Vui lòng nhập email.';
    else if (!/\S+@\S+\.\S+/.test(email)) tempErrors.email = 'Email không hợp lệ.';
    
    if (!password) tempErrors.password = 'Vui lòng nhập mật khẩu.';
    else if (password.length < 6) tempErrors.password = 'Mật khẩu phải dài ít nhất 6 ký tự.';

    if (!fullName) tempErrors.fullName = 'Vui lòng nhập họ và tên.';
    if (!phone) tempErrors.phone = 'Vui lòng nhập số điện thoại.';
    if (!startupName) tempErrors.startupName = 'Vui lòng nhập tên Startup.';

    setErrors(tempErrors);
    return Object.keys(tempErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      setLoading(true);
      const res = await registerStartup(
        email,
        password,
        fullName,
        phone,
        startupName,
        businessType,
        activationCode
      );

      if (res.success) {
        showToast('Đăng ký Startup thành công!', 'success');
        router.push('/login');
      } else {
        showToast(res.error || 'Có lỗi xảy ra khi đăng ký.', 'error');
      }
    } catch (err) {
      showToast('Lỗi mạng hoặc hệ thống, vui lòng thử lại.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0b0f19] flex items-center justify-center p-4 md:p-8 relative overflow-hidden font-sans text-slate-800 dark:text-slate-200 transition-all duration-300">
      {/* Background blobs đồng bộ 100% với trang đăng nhập */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-orange-200/40 dark:bg-orange-500/10 rounded-full blur-[100px]"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-red-100/40 dark:bg-red-500/10 rounded-full blur-[100px]"></div>

      {/* Main card đồng bộ với trang đăng nhập */}
      <div className="max-w-5xl w-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-2xl dark:shadow-slate-950/40 flex flex-col md:flex-row overflow-hidden min-h-[650px] animate-in fade-in zoom-in-95 duration-500 relative z-10">
        
        {/* Banner trái - Đồng bộ 100% với trang Đăng Nhập */}
        <div className="md:w-1/2 bg-gradient-to-br from-slate-900 via-slate-800 to-orange-950 p-8 md:p-12 flex flex-col justify-between text-white relative">
          {/* Decorative Pattern overlay */}
          <div className="absolute inset-0 bg-[radial-gradient(#ea580c_1px,transparent_1px)] [background-size:24px_24px] opacity-10"></div>
          
          <div className="flex items-center gap-3 relative z-10">
            <div className="bg-orange-600 p-2.5 rounded-xl shadow-lg shadow-orange-500/20">
              <Home className="text-white" size={24} />
            </div>
            <span className="text-xl font-bold">Rentify</span>
          </div>

          <div className="my-auto space-y-5 max-w-sm relative z-10 pt-12 pb-12">
            <span className="text-orange-500 text-xs font-bold uppercase bg-orange-500/10 px-3 py-1 rounded-full border border-orange-500/20 w-fit block">
              Dành Cho Chủ Startup
            </span>
            <h2 className="text-2xl md:text-3xl font-extrabold leading-tight">Khởi tạo chuỗi lưu trú của riêng bạn 🚀</h2>
            <p className="text-slate-400 text-sm leading-relaxed">
              Giải pháp tối ưu hóa đặt căn hộ, tự động hóa tin nhắn xác nhận tiền cọc và quản lý tài chính chuyên nghiệp hàng đầu.
            </p>

            <div className="space-y-2.5 pt-2">
              <div className="flex items-center gap-2.5 text-xs text-slate-300 font-semibold">
                <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                <span>Không giới hạn số lượng căn hộ, homestay</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs text-slate-300 font-semibold">
                <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                <span>Mẫu xác nhận cọc cá nhân hóa thông minh</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs text-slate-300 font-semibold">
                <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                <span>Hệ thống phân vai trò: Owner, Admin, Staff</span>
              </div>
            </div>
          </div>

          <div className="text-xs text-slate-500 relative z-10 flex justify-between">
            <span>© 2026 Rentify Corp.</span>
            <span>Phiên bản Enterprise v2.0</span>
          </div>
        </div>

        {/* Form phải - Đồng bộ với input field và form style của website */}
        <div className="md:w-1/2 p-6 md:p-10 flex flex-col justify-center bg-white dark:bg-slate-900 relative max-h-[85vh] md:max-h-none overflow-y-auto">
          <div className="space-y-5 w-full max-w-md mx-auto animate-in slide-in-from-right-4 duration-300">
            
            <div className="space-y-1">
              <Link
                href="/login"
                className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-orange-600 transition-colors w-fit"
              >
                <ArrowLeft size={12} /> Quay lại đăng nhập
              </Link>
              <h1 className="text-2xl font-bold text-slate-950 dark:text-white">Đăng ký chuỗi mới ✨</h1>
              <p className="text-slate-500 dark:text-slate-400 text-xs font-semibold">Bắt đầu kinh doanh lưu trú chuyên nghiệp</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5" noValidate>
              
              {/* Cụm 1: Thông tin Chuỗi */}
              <div className="bg-slate-50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-700 rounded-2xl p-4 space-y-3">
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase flex items-center gap-1 border-b border-slate-200/50 dark:border-slate-700 pb-1.5">
                  <Building2 size={12} className="text-orange-600" /> Startup / Chuỗi Kinh Doanh
                </span>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">Tên chuỗi kinh doanh</label>
                  <input
                    type="text"
                    value={startupName}
                    onChange={(e) => setStartupName(e.target.value)}
                    placeholder="Ví dụ: Homestay Dalat Hill"
                    className={`w-full bg-white dark:bg-slate-950 border focus:ring-4 focus:ring-orange-500/5 rounded-xl py-2 px-3.5 outline-none text-xs font-semibold text-slate-800 dark:text-slate-200 transition-all ${
                      errors.startupName ? 'border-red-500 focus:border-red-500' : 'border-slate-200 dark:border-slate-700 focus:border-orange-500 dark:focus:border-orange-500'
                    }`}
                    disabled={loading}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">Loại hình lưu trú</label>
                  <select
                    value={businessType}
                    onChange={(e) => setBusinessType(e.target.value)}
                    className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/5 rounded-xl py-2 px-3.5 outline-none text-xs font-semibold text-slate-700 dark:text-slate-300 transition-all cursor-pointer"
                    disabled={loading}
                  >
                    <option value="homestay">Homestay / Hostel</option>
                    <option value="villa">Biệt thự / Villa</option>
                    <option value="apartment">Căn hộ dịch vụ</option>
                    <option value="hotel">Khách sạn nhỏ</option>
                    <option value="room">Phòng cho thuê</option>
                  </select>
                </div>
              </div>

              {/* Cụm 2: Tài khoản Chủ sở hữu */}
              <div className="bg-slate-50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-700 rounded-2xl p-4 space-y-3">
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase flex items-center gap-1 border-b border-slate-200/50 dark:border-slate-700 pb-1.5">
                  <User size={12} className="text-orange-600" /> Tài khoản Chủ chuỗi (Owner)
                </span>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">Họ và Tên</label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Họ Tên của bạn"
                      className={`w-full bg-white dark:bg-slate-950 border focus:ring-4 focus:ring-orange-500/5 rounded-xl py-2 px-3 outline-none text-xs font-semibold text-slate-800 dark:text-slate-200 transition-all ${
                        errors.fullName ? 'border-red-500 focus:border-red-500' : 'border-slate-200 dark:border-slate-700 focus:border-orange-500 dark:focus:border-orange-500'
                      }`}
                      disabled={loading}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">SĐT liên hệ</label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="0326xxxxxx"
                      className={`w-full bg-white dark:bg-slate-950 border focus:ring-4 focus:ring-orange-500/5 rounded-xl py-2 px-3 outline-none text-xs font-semibold text-slate-800 dark:text-slate-200 transition-all ${
                        errors.phone ? 'border-red-500 focus:border-red-500' : 'border-slate-200 dark:border-slate-700 focus:border-orange-500 dark:focus:border-orange-500'
                      }`}
                      disabled={loading}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">Email đăng nhập</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="email-cua-ban@gmail.com"
                    className={`w-full bg-white dark:bg-slate-950 border focus:ring-4 focus:ring-orange-500/5 rounded-xl py-2 px-3.5 outline-none text-xs font-semibold text-slate-800 dark:text-slate-200 transition-all ${
                      errors.email ? 'border-red-500 focus:border-red-500' : 'border-slate-200 dark:border-slate-700 focus:border-orange-500 dark:focus:border-orange-500'
                    }`}
                    disabled={loading}
                  />
                  {errors.email && <p className="text-red-500 text-[10px] font-bold mt-1">{errors.email}</p>}
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">Mật khẩu mới</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Tối thiểu 6 ký tự"
                      className={`w-full bg-white dark:bg-slate-950 border focus:ring-4 focus:ring-orange-500/5 rounded-xl py-2 px-3.5 pr-10 outline-none text-xs font-semibold text-slate-800 dark:text-slate-200 transition-all ${
                        errors.password ? 'border-red-500 focus:border-red-500' : 'border-slate-200 dark:border-slate-700 focus:border-orange-500 dark:focus:border-orange-500'
                      }`}
                      disabled={loading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 hover:text-orange-500 transition-colors cursor-pointer"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {errors.password && <p className="text-red-500 text-[10px] font-bold mt-1">{errors.password}</p>}
                </div>
              </div>

              {/* Cụm 3: Mã kích hoạt nhanh */}
              <div className="bg-slate-50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-700 rounded-2xl p-4 space-y-2">
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase flex items-center gap-1 border-b border-slate-200/50 dark:border-slate-700 pb-1.5">
                  <Sparkles size={12} className="text-orange-600" /> Mã kích hoạt Premium (Nếu có)
                </span>
                <input
                  type="text"
                  value={activationCode}
                  onChange={(e) => setActivationCode(e.target.value)}
                  placeholder="Để trống nếu cần duyệt thủ công"
                  className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/5 rounded-xl py-2 px-3.5 outline-none text-xs font-semibold text-slate-800 dark:text-slate-200 transition-all placeholder:text-slate-300 dark:placeholder:text-slate-600"
                  disabled={loading}
                />
              </div>

              <button
                type="submit"
                className="w-full bg-slate-900 hover:bg-orange-600 text-white font-bold py-3 rounded-2xl transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2 text-xs md:text-sm tracking-wide cursor-pointer shadow-slate-900/10"
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="animate-spin" size={16} />
                ) : (
                  <>
                    Khởi Tạo Startup <Sparkles size={16} />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

      </div>
    </div>
  );
}