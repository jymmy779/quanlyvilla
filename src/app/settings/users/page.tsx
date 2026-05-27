'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useNotification } from '@/context/NotificationContext';
import {
  Users, KeyRound, Trash2, ShieldAlert,
  ArrowLeft, Search, Loader2, Calendar, Mail, Phone, UserCheck, ShieldAlert as AlertIcon, Lock, Check, X, Plus, User
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { UserProfile, UserRole } from '@/types';
import { useFormStore } from '@/lib/formStore';
import { translateAuthError } from '@/lib/errorTranslator';



export default function UsersManagementPage() {
  const { profile: currentAdminProfile } = useAuth();
  const { showToast, confirm: showConfirmModal } = useNotification();
  const router = useRouter();

  // States
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // States cho modal reset mật khẩu
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  // States cho modal thêm tài khoản mới
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);

  const {
    createFullName,
    createPhone,
    createEmail,
    createPassword,
    createRole,
    createErrors,
    setCreateFullName,
    setCreatePhone,
    setCreateEmail,
    setCreatePassword,
    setCreateRole,
    validateCreateUser,
    resetCreateForm
  } = useFormStore();



  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (err) {
      console.error(err);
      showToast('Lỗi khi lấy danh sách nhân viên!', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Cập nhật vai trò (cấp quyền) trực tiếp
  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    if (userId === currentAdminProfile?.id) {
      showToast('Bạn không thể tự thay đổi quyền hạn của chính mình!', 'error');
      return;
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId);

      if (error) throw error;

      showToast('Cập nhật quyền hạn nhân viên thành công!', 'success');
      
      // Update local state
      setUsers(prev =>
        prev.map(u => (u.id === userId ? { ...u, role: newRole } : u))
      );
    } catch (err) {
      console.error(err);
      showToast('Lỗi khi thay đổi quyền hạn!', 'error');
    }
  };

  // Admin đặt lại mật khẩu cho nhân viên
  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    if (!newPassword || newPassword.length < 6) {
      showToast('Mật khẩu mới phải có tối thiểu 6 ký tự!', 'error');
      return;
    }

    try {
      setResetLoading(true);

      // Lấy access token của admin hiện tại để gửi lên API xác thực
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || '';

      const response = await fetch('/api/admin/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          userId: selectedUser.id,
          newPassword: newPassword
        })
      });

      const resData = await response.json();

      if (response.ok && resData.success) {
        showToast(`Đặt lại mật khẩu cho ${selectedUser.full_name || selectedUser.email} thành công!`, 'success');
        setIsResetModalOpen(false);
        setSelectedUser(null);
        setNewPassword('');
      } else {
        // Nếu server báo lỗi cấu hình SUPABASE_SERVICE_ROLE_KEY
        if (response.status === 501) {
          // Gợi ý admin gửi link reset mật khẩu qua email thay thế
          showConfirmModal({
            title: 'Chưa cấu hình Server Key',
            message: 'Tính năng reset trực tiếp yêu cầu đặt biến SUPABASE_SERVICE_ROLE_KEY. Bạn có muốn gửi email tự động yêu cầu nhân viên đặt lại mật khẩu thay thế không?',
            onConfirm: () => handleSendEmailReset(selectedUser)
          });
        } else {
          showToast(translateAuthError(resData.error) || 'Lỗi khi đặt lại mật khẩu.', 'error');
        }
      }
    } catch (err) {
      console.error(err);
      showToast('Lỗi kết nối đến server.', 'error');
    } finally {
      setResetLoading(false);
    }
  };

  // Admin thêm tài khoản nhân viên mới trực tiếp
  const handleCreateUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate bằng Zustand Store
    const isValid = validateCreateUser();
    if (!isValid) return;

    try {
      setCreateLoading(true);

      // Lấy token xác thực của admin hiện tại
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || '';

      const response = await fetch('/api/admin/create-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          email: createEmail,
          password: createPassword,
          fullName: createFullName,
          phone: createPhone,
          role: createRole
        })
      });

      const resData = await response.json();

      if (response.ok && resData.success) {
        showToast('Đã thêm và kích hoạt tài khoản nhân viên thành công!', 'success');
        setIsCreateModalOpen(false);
        resetCreateForm();
        fetchUsers();
      } else {
        if (response.status === 501) {
          // Báo lỗi service role key chưa đặt
          showConfirmModal({
            title: 'Chưa cấu hình Server Key',
            message: 'Tính năng tạo tài khoản nhân viên trực tiếp yêu cầu đặt biến SUPABASE_SERVICE_ROLE_KEY trong file .env.local trên máy chủ của bạn.',
            onConfirm: () => {}
          });
        } else {
          showToast(translateAuthError(resData.error) || 'Lỗi khi tạo tài khoản nhân viên.', 'error');
        }
      }
    } catch (err) {
      console.error(err);
      showToast('Lỗi kết nối tạo tài khoản.', 'error');
    } finally {
      setCreateLoading(false);
    }
  };



  // Gửi link reset qua email
  const handleSendEmailReset = async (userProfile: UserProfile) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(userProfile.email, {
        redirectTo: `${window.location.origin}/reset-password`
      });
      if (error) throw error;
      showToast(`Đã gửi email khôi phục mật khẩu đến ${userProfile.email}!`, 'success');
    } catch (err: any) {
      showToast(translateAuthError(err.message) || 'Lỗi khi gửi email reset.', 'error');
    }
  };

  // Xóa tài khoản nhân viên (Xóa khỏi bảng profiles)
  const handleDeleteUser = (userProfile: UserProfile) => {
    if (userProfile.id === currentAdminProfile?.id) {
      showToast('Bạn không thể tự xóa tài khoản của chính mình!', 'error');
      return;
    }

    showConfirmModal({
      title: 'Xóa tài khoản nhân viên?',
      message: `Bạn có chắc muốn xóa tài khoản của ${userProfile.full_name || userProfile.email}? Hành động này sẽ tước quyền truy cập hệ thống ngay lập tức.`,
      onConfirm: async () => {
        try {
          const { error } = await supabase
            .from('profiles')
            .delete()
            .eq('id', userProfile.id);

          if (error) throw error;

          showToast('Đã xóa tài khoản nhân viên thành công!', 'success');
          setUsers(prev => prev.filter(u => u.id !== userProfile.id));
        } catch (err) {
          console.error(err);
          showToast('Lỗi khi xóa tài khoản!', 'error');
        }
      }
    });
  };

  // Lọc tìm kiếm nhân viên
  const filteredUsers = users.filter(u => {
    const term = searchTerm.toLowerCase();
    return (
      u.email.toLowerCase().includes(term) ||
      (u.full_name || '').toLowerCase().includes(term) ||
      (u.phone || '').includes(term)
    );
  });

  const getInitials = (name: string) => {
    if (!name) return 'U';
    const parts = name.split(' ');
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  };

  const getRoleBadgeClass = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return 'bg-red-50 text-red-600 border-red-200';
      case 'staff':
        return 'bg-orange-50 text-orange-600 border-orange-200';
      case 'pending':
        return 'bg-slate-100 text-slate-500 border-slate-200';
    }
  };

  const getRoleLabel = (role: UserRole) => {
    switch (role) {
      case 'admin': return 'Quản trị';
      case 'staff': return 'Nhân viên';
      case 'pending': return 'Chờ duyệt';
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-12">
      
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/80 backdrop-blur-md sticky top-0 z-20 py-4 -mx-4 px-4 border-b border-slate-100 mb-6">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-500 hover:text-slate-900 transition-all shadow-sm">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-950 flex items-center gap-3">
              <Users className="text-orange-600" />
              Quản lý tài khoản
            </h1>
            <p className="text-slate-500 font-medium text-sm mt-0.5">Phê duyệt và phân quyền cho đội ngũ nhân viên</p>
          </div>
        </div>

        {/* Nút thêm nhân viên mới */}
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-orange-600 text-white font-bold rounded-xl text-xs transition-all shadow-lg active:scale-95 cursor-pointer shadow-slate-900/10 self-start md:self-auto"
        >
          <Plus size={16} /> Thêm nhân viên
        </button>
      </header>


      {/* Main card */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
        
        {/* Thanh tìm kiếm */}
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="relative w-full sm:max-w-md group">
            <Search className="absolute left-4 top-3 text-slate-400 group-focus-within:text-orange-500 transition-colors" size={18} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm nhân viên theo tên, email hoặc SĐT..."
              className="w-full bg-slate-50 border border-slate-200 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/5 rounded-2xl py-2.5 pl-12 pr-4 outline-none text-sm font-semibold text-slate-800 transition-all"
            />
          </div>
          <div className="text-slate-400 text-xs font-bold uppercase">
            Tổng cộng: {users.length} tài khoản
          </div>
        </div>

        {/* Danh sách người dùng */}
        {loading ? (
          <div className="py-20 flex justify-center items-center">
            <Loader2 className="text-orange-500 animate-spin" size={40} />
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="py-20 text-center space-y-3 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
            <Users className="mx-auto text-slate-300 animate-pulse" size={48} />
            <p className="text-slate-400 text-sm font-semibold">Không tìm thấy thành viên nào phù hợp!</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-100">
            <table className="w-full text-left min-w-[800px]">
              <thead>
                <tr className="bg-slate-55 bg-slate-50/80 border-b border-slate-100 text-slate-400 text-xs font-bold uppercase">
                  <th className="py-4 pl-6">Nhân viên</th>
                  <th className="py-4">Liên hệ</th>
                  <th className="py-4">Quyền truy cập</th>
                  <th className="py-4">Ngày tham gia</th>
                  <th className="py-4 text-center pr-6">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {filteredUsers.map((u) => {
                  const isSelf = u.id === currentAdminProfile?.id;
                  return (
                    <tr key={u.id} className="group hover:bg-slate-50/50 transition-colors">
                      {/* Cột Tên & Avatar */}
                      <td className="py-4 pl-6">
                        <div className="flex items-center gap-3.5">
                          <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-sm shadow-inner text-white ${
                            u.role === 'admin' ? 'bg-gradient-to-tr from-red-500 to-rose-400' :
                            u.role === 'staff' ? 'bg-gradient-to-tr from-orange-500 to-amber-400' : 'bg-slate-400'
                          }`}>
                            {getInitials(u.full_name || '')}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 text-sm flex items-center gap-1.5 leading-tight">
                              {u.full_name || 'Chưa cập nhật'}
                              {isSelf && (
                                <span className="bg-slate-100 text-slate-500 font-bold px-1.5 py-0.5 rounded text-[9px]  border border-slate-200">Bạn</span>
                              )}
                            </p>
                            <p className="text-slate-400 text-xs font-medium mt-0.5">{u.email}</p>
                          </div>
                        </div>
                      </td>

                      {/* Cột Liên hệ */}
                      <td className="py-4">
                        <div className="space-y-1">
                          <p className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                            <Phone size={12} className="text-slate-400" />
                            {u.phone || 'Chưa có SĐT'}
                          </p>
                          <p className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
                            <Mail size={12} className="text-slate-400" />
                            {u.email}
                          </p>
                        </div>
                      </td>

                      {/* Cột Cấp quyền (Dropdown) */}
                      <td className="py-4">
                        {isSelf ? (
                          <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getRoleBadgeClass(u.role)}`}>
                            {getRoleLabel(u.role)}
                          </span>
                        ) : (
                          <div className="relative w-fit">
                            <select
                              value={u.role}
                              onChange={(e) => handleRoleChange(u.id, e.target.value as UserRole)}
                              className={`appearance-none bg-white font-bold text-xs px-3.5 py-1.5 rounded-xl border outline-none cursor-pointer pr-8 hover:shadow-sm transition-all ${
                                getRoleBadgeClass(u.role)
                              }`}
                            >
                              <option value="pending" className="text-slate-700 bg-white">Chờ duyệt</option>
                              <option value="staff" className="text-orange-600 bg-white">Nhân viên</option>
                              <option value="admin" className="text-red-600 bg-white">Quản trị</option>
                            </select>
                            <div className="absolute right-2.5 top-2.5 pointer-events-none text-slate-400">
                              <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                            </div>
                          </div>
                        )}
                      </td>

                      {/* Cột Ngày tham gia */}
                      <td className="py-4 text-xs font-semibold text-slate-500">
                        <div className="flex items-center gap-1.5">
                          <Calendar size={13} className="text-slate-400" />
                          {new Date(u.created_at).toLocaleDateString('vi-VN')}
                        </div>
                      </td>

                      {/* Cột Hành động */}
                      <td className="py-4 text-center pr-6">
                        <div className="flex items-center justify-center gap-2">
                          {/* Đặt lại mật khẩu */}
                          <button
                            onClick={() => {
                              setSelectedUser(u);
                              setIsResetModalOpen(true);
                            }}
                            className="p-2 hover:bg-orange-50 text-slate-400 hover:text-orange-600 rounded-xl transition-all"
                            title="Đặt lại mật khẩu"
                          >
                            <KeyRound size={16} />
                          </button>

                          {/* Xóa tài khoản */}
                          {!isSelf && (
                            <button
                              onClick={() => handleDeleteUser(u)}
                              className="p-2 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-xl transition-all"
                              title="Xóa tài khoản nhân viên"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL RESET MẬT KHẨU */}
      {isResetModalOpen && selectedUser && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white max-w-md w-full rounded-3xl border border-slate-200 shadow-2xl p-6 md:p-8 space-y-6 animate-in zoom-in-95 duration-300">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-lg font-bold text-slate-950 flex items-center gap-2">
                  <Lock className="text-orange-600" size={20} />
                  Reset mật khẩu nhân viên
                </h2>
                <p className="text-slate-400 text-xs font-semibold mt-1">
                  Đang đặt mật khẩu mới cho: <span className="text-slate-700">{selectedUser.full_name || selectedUser.email}</span>
                </p>
              </div>
              <button
                onClick={() => {
                  setIsResetModalOpen(false);
                  setSelectedUser(null);
                  setNewPassword('');
                }}
                className="p-1.5 hover:bg-slate-50 border border-slate-100 text-slate-400 hover:text-slate-600 rounded-xl transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleResetPasswordSubmit} className="space-y-4 pt-2" noValidate>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Mật khẩu mới</label>
                <div className="relative group">
                  <Lock className="absolute left-4 top-3.5 text-slate-400 group-focus-within:text-orange-500 transition-colors" size={16} />
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Mật khẩu tạm tối thiểu 6 ký tự"
                    className="w-full bg-slate-50 border border-slate-200 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/5 rounded-2xl py-3 pl-11 pr-4 outline-none text-xs font-semibold text-slate-800 transition-all"
                    disabled={resetLoading}
                    autoFocus
                  />
                </div>
              </div>

              <div className="bg-orange-50/50 border border-orange-100 rounded-2xl p-3.5 flex gap-2.5 text-xs text-orange-700 leading-relaxed font-semibold">
                <ShieldAlert size={16} className="text-orange-500 flex-shrink-0 mt-0.5" />
                Hãy đảm bảo gửi lại mật khẩu mới này cho nhân viên sau khi bạn đặt lại thành công.
              </div>

              <div className="pt-2 border-t border-slate-100 flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsResetModalOpen(false);
                    setSelectedUser(null);
                    setNewPassword('');
                  }}
                  className="flex-1 py-3 border border-slate-200 hover:bg-slate-50 rounded-xl text-slate-500 font-bold transition-all text-xs active:scale-95"
                  disabled={resetLoading}
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-slate-900 hover:bg-orange-600 text-white rounded-xl font-bold transition-all text-xs flex items-center justify-center gap-1.5 active:scale-95 shadow-md"
                  disabled={resetLoading}
                >
                  {resetLoading ? (
                    <Loader2 className="animate-spin" size={14} />
                  ) : (
                    <>
                      Đặt mật khẩu <Check size={14} />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL THÊM TÀI KHOẢN MỚI */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white max-w-lg w-full rounded-3xl border border-slate-200 shadow-2xl p-6 md:p-8 space-y-5 animate-in zoom-in-95 duration-300">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-lg font-bold text-slate-950 flex items-center gap-2">
                  <Plus className="text-orange-600" size={20} />
                  Thêm nhân viên mới
                </h2>
                <p className="text-slate-400 text-xs font-semibold mt-1">
                  Tài khoản nhân viên được kích hoạt và gán quyền ngay lập tức
                </p>
              </div>
              <button
                onClick={() => {
                  setIsCreateModalOpen(false);
                  resetCreateForm();
                }}
                className="p-1.5 hover:bg-slate-50 border border-slate-100 text-slate-400 hover:text-slate-600 rounded-xl transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateUserSubmit} className="space-y-4 pt-2" noValidate>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Họ và Tên</label>
                  <div className="relative group">
                    <User className="absolute left-4 top-3.5 text-slate-400 group-focus-within:text-orange-500 transition-colors" size={16} />
                    <input
                      type="text"
                      value={createFullName}
                      onChange={(e) => setCreateFullName(e.target.value)}
                      placeholder="Nguyễn Văn A"
                      className={`w-full bg-slate-50 border focus:ring-4 focus:ring-orange-500/5 rounded-2xl py-2.5 pl-11 pr-4 outline-none text-xs font-semibold text-slate-800 transition-all ${
                        createErrors.fullName ? 'border-red-500 focus:border-red-500' : 'border-slate-200 focus:border-orange-500'
                      }`}
                      disabled={createLoading}
                    />
                  </div>
                  {createErrors.fullName && (
                    <p className="text-red-500 text-[10px] font-bold mt-1 animate-in fade-in duration-200 flex items-center gap-1">
                      <span className="w-1 h-1 bg-red-500 rounded-full inline-block"></span>
                      {createErrors.fullName}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Số điện thoại</label>
                  <div className="relative group">
                    <Phone className="absolute left-4 top-3.5 text-slate-400 group-focus-within:text-orange-500 transition-colors" size={16} />
                    <input
                      type="text"
                      value={createPhone}
                      onChange={(e) => setCreatePhone(e.target.value)}
                      placeholder="09xxxxxxxx"
                      className={`w-full bg-slate-50 border focus:ring-4 focus:ring-orange-500/5 rounded-2xl py-2.5 pl-11 pr-4 outline-none text-xs font-semibold text-slate-800 transition-all ${
                        createErrors.phone ? 'border-red-500 focus:border-red-500' : 'border-slate-200 focus:border-orange-500'
                      }`}
                      disabled={createLoading}
                    />
                  </div>
                  {createErrors.phone && (
                    <p className="text-red-500 text-[10px] font-bold mt-1 animate-in fade-in duration-200 flex items-center gap-1">
                      <span className="w-1 h-1 bg-red-500 rounded-full inline-block"></span>
                      {createErrors.phone}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Email liên hệ</label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-3.5 text-slate-400 group-focus-within:text-orange-500 transition-colors" size={16} />
                  <input
                    type="email"
                    value={createEmail}
                    onChange={(e) => setCreateEmail(e.target.value)}
                    placeholder="nhanvien@congty.com"
                    className={`w-full bg-slate-50 border focus:ring-4 focus:ring-orange-500/5 rounded-2xl py-2.5 pl-11 pr-4 outline-none text-xs font-semibold text-slate-800 transition-all ${
                      createErrors.email ? 'border-red-500 focus:border-red-500' : 'border-slate-200 focus:border-orange-500'
                    }`}
                    disabled={createLoading}
                  />
                </div>
                {createErrors.email && (
                  <p className="text-red-500 text-[10px] font-bold mt-1 animate-in fade-in duration-200 flex items-center gap-1">
                    <span className="w-1 h-1 bg-red-500 rounded-full inline-block"></span>
                    {createErrors.email}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Mật khẩu ban đầu</label>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-3.5 text-slate-400 group-focus-within:text-orange-500 transition-colors" size={16} />
                    <input
                      type="password"
                      value={createPassword}
                      onChange={(e) => setCreatePassword(e.target.value)}
                      placeholder="Mật khẩu tối thiểu 6 ký tự"
                      className={`w-full bg-slate-50 border focus:ring-4 focus:ring-orange-500/5 rounded-2xl py-2.5 pl-11 pr-4 outline-none text-xs font-semibold text-slate-800 transition-all ${
                        createErrors.password ? 'border-red-500 focus:border-red-500' : 'border-slate-200 focus:border-orange-500'
                      }`}
                      disabled={createLoading}
                    />
                  </div>
                  {createErrors.password && (
                    <p className="text-red-500 text-[10px] font-bold mt-1 animate-in fade-in duration-200 flex items-center gap-1">
                      <span className="w-1 h-1 bg-red-500 rounded-full inline-block"></span>
                      {createErrors.password}
                    </p>
                  )}
                </div>


                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Vai trò truy cập</label>
                  <div className="relative">
                    <select
                      value={createRole}
                      onChange={(e) => setCreateRole(e.target.value as UserRole)}
                      className="w-full bg-slate-50 border border-slate-200 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/5 rounded-2xl py-2.5 px-4 outline-none text-xs font-bold text-slate-800 cursor-pointer appearance-none"
                      disabled={createLoading}
                    >
                      <option value="staff">Nhân viên (Staff)</option>
                      <option value="admin">Quản trị viên (Admin)</option>
                    </select>
                    <div className="absolute right-4 top-3.5 pointer-events-none text-slate-400">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreateModalOpen(false);
                    resetCreateForm();
                  }}
                  className="flex-1 py-3 border border-slate-200 hover:bg-slate-50 rounded-xl text-slate-500 font-bold transition-all text-xs active:scale-95 cursor-pointer"
                  disabled={createLoading}
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-slate-900 hover:bg-orange-600 text-white rounded-xl font-bold transition-all text-xs flex items-center justify-center gap-1.5 active:scale-95 shadow-md cursor-pointer"
                  disabled={createLoading}
                >
                  {createLoading ? (
                    <Loader2 className="animate-spin" size={14} />
                  ) : (
                    <>
                      Tạo tài khoản <Check size={14} />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
