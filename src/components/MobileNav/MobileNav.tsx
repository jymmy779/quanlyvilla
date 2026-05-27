'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, Calendar, DollarSign, Hotel, Settings, LogOut, Menu, X, User } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useNotification } from '@/context/NotificationContext';


const MobileNav = () => {
  const pathname = usePathname();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const { profile, role, logout } = useAuth();
  const { confirm } = useNotification();

  const handleLogoutClick = () => {
    confirm({
      title: 'Đăng xuất tài khoản?',
      message: 'Bạn có chắc chắn muốn đăng xuất khỏi hệ thống quản lý Rentify không?',
      onConfirm: () => logout(),
      confirmText: 'Đăng xuất',
      cancelText: 'Hủy'
    });
  };


  const mainItems = [
    { name: 'Tổng quan', href: '/', icon: LayoutDashboard },
    { name: 'Lịch', href: '/calendar', icon: Calendar },
    { name: 'Giá', href: '/pricing', icon: DollarSign },
    { name: 'Quản lý căn', href: '/villas', icon: Hotel },
  ];

  useEffect(() => {
    const routes = ['/', '/calendar', '/pricing', '/villas', '/settings', '/settings/users'];
    routes.forEach((route) => {
      Promise.resolve(router.prefetch(route)).catch(() => {});
    });
  }, [router]);

  const navigateTo = (event: React.MouseEvent, href: string) => {
    event.preventDefault();
    setIsOpen(false);
    if (isNavigating || href === pathname) return;

    setIsNavigating(true);
    requestAnimationFrame(() => {
      router.push(href);
      requestAnimationFrame(() => setIsNavigating(false));
    });
  };

  const moreItems = [
    { name: 'Cài đặt', href: '/settings', icon: Settings },
    { name: 'Đăng xuất', icon: LogOut, isAction: true },
  ];

  const getInitials = (name: string) => {
    if (!name) return 'U';
    const parts = name.split(' ');
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  };

  return (
    <>



      {/* Overlay Menu */}
      {isOpen && (
        <div 
          className="xl:hidden fixed inset-0 bg-slate-900/40 backdrop-blur-[2px] z-49 transition-all duration-300"
          onClick={() => setIsOpen(false)}
        >
          <div 
            className="absolute bottom-24 right-4 bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-slate-100 p-3 min-w-52.5 overflow-hidden space-y-2 animate-in slide-in-from-bottom-2 duration-250"
            onClick={(e) => e.stopPropagation()}
          >
            {/* User Profile Widget */}
            {profile && (
              <div className="flex items-center gap-2.5 p-2 bg-slate-55 bg-slate-50 border border-slate-100 rounded-xl mb-1">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs text-white ${
                  role === 'owner'
                    ? 'bg-linear-to-tr from-violet-600 to-fuchsia-400'
                    : role === 'admin' 
                    ? 'bg-linear-to-tr from-red-500 to-rose-400' 
                    : 'bg-linear-to-tr from-orange-500 to-amber-400'
                }`}>
                  {getInitials(profile.full_name || '')}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-[11px] text-slate-900 truncate leading-tight">
                    {profile.full_name || 'Chưa cập nhật'}
                  </p>
                  <span className={`text-[8px] font-bold uppercase block mt-0.5 ${
                    role === 'owner' ? 'text-violet-500' : role === 'admin' ? 'text-red-500' : 'text-orange-500'
                  }`}>
                    {role === 'owner' ? 'Chủ sở hữu' : role === 'admin' ? 'Quản trị' : 'Nhân viên'}
                  </span>
                </div>
              </div>
            )}

            <div className="px-1 py-1 border-b border-slate-50">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Tài khoản</span>
            </div>
            
            {moreItems.map((item) => (
              item.isAction ? (
                <button
                  key={item.name}
                  className="flex items-center gap-3 w-full px-3 py-2.5 text-red-500 hover:bg-red-50 rounded-xl transition-all cursor-pointer font-semibold text-xs active:scale-95"
                  onClick={() => {
                    setIsOpen(false);
                    handleLogoutClick();
                  }}
                >
                  <div className="bg-red-50 p-1.5 rounded-lg text-red-500">
                    <item.icon size={16} />
                  </div>
                  <span>{item.name}</span>
                </button>
              ) : (
                <Link
                  key={item.href}
                  href={item.href!}
                  prefetch
                  onMouseEnter={() => {
                    Promise.resolve(router.prefetch(item.href!)).catch(() => {});
                  }}
                  onClick={(event) => navigateTo(event, item.href!)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all font-semibold text-xs ${
                    pathname.startsWith(item.href!) ? 'bg-orange-50 text-orange-600' : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <div className={`p-1.5 rounded-lg transition-colors ${
                    pathname.startsWith(item.href!) ? 'bg-orange-100' : 'bg-slate-50'
                  }`}>
                    <item.icon size={16} />
                  </div>
                  <span>{item.name}</span>
                </Link>
              )
            ))}
          </div>
        </div>
      )}

      {/* Main Nav Bar */}
      <nav className="xl:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-50 px-4 py-3 flex justify-between items-center shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
        {mainItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch
              onMouseEnter={() => {
                Promise.resolve(router.prefetch(item.href)).catch(() => {});
              }}
              onClick={(event) => navigateTo(event, item.href)}
              className={`flex flex-col items-center gap-1 transition-all duration-300 ${
                isActive ? 'text-orange-600' : 'text-slate-400'
              }`}
            >
              <div className={`p-1.5 rounded-xl transition-all duration-300 ${isActive ? 'bg-orange-50 scale-110' : 'hover:bg-slate-50'}`}>
                <item.icon size={22} strokeWidth={isActive ? 2.5 : 2} />
              </div>
              <span className={`text-[10px] font-bold tracking-tight ${isActive ? 'opacity-100' : 'opacity-60'}`}>
                {item.name}
              </span>
            </Link>
          );
        })}

        {/* More Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`flex flex-col items-center gap-1 transition-all duration-300 ${
            isOpen ? 'text-orange-600' : 'text-slate-400'
          }`}
        >
          <div className={`p-1.5 rounded-xl transition-all duration-300 ${isOpen ? 'bg-orange-50 scale-110' : 'hover:bg-slate-50'}`}>
            {isOpen ? <X size={22} strokeWidth={2.5} /> : <Menu size={22} strokeWidth={2} />}
          </div>
          <span className={`text-[10px] font-bold tracking-tight ${isOpen ? 'opacity-100' : 'opacity-60'}`}>
            Thêm
          </span>
        </button>
      </nav>
    </>
  );
};

export default MobileNav;
