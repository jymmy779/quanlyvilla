'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Calendar, DollarSign, Home, Settings, LogOut, Hotel } from 'lucide-react';

const Sidebar = () => {
  const pathname = usePathname();

  const menuItems = [
    { name: 'Tổng quan', href: '/', icon: LayoutDashboard },
    { name: 'Lịch đặt', href: '/calendar', icon: Calendar },
    { name: 'Quản lý giá', href: '/pricing', icon: DollarSign },
    { name: 'Villa của tôi', href: '/villas', icon: Hotel },
  ];

  return (
    <aside className="hidden xl:flex fixed left-0 top-0 h-screen w-64 bg-white border-r border-slate-200 z-50 flex-col p-6 shadow-sm">
      <div className="flex items-center gap-3 mb-10 px-2">
        <div className="bg-orange-600 p-2 rounded-xl shadow-lg shadow-orange-500/20">
          <Home className="text-white" size={24} />
        </div>
        <span className="text-xl font-semibold text-slate-900">
          VillaManager
        </span>
      </div>

      <nav className="flex-1 space-y-1">
        {menuItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group ${
                isActive
                  ? 'bg-orange-50 text-orange-600 font-semibold'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <item.icon size={20} className={isActive ? 'text-orange-600' : 'group-hover:scale-110 transition-transform'} />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto pt-6 border-t border-slate-100 space-y-1">
        <Link 
          href="/settings"
          className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group ${
            pathname === '/settings'
              ? 'bg-orange-50 text-orange-600 font-semibold'
              : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
          }`}
        >
          <Settings size={20} className={pathname === '/settings' ? 'text-orange-600' : 'group-hover:rotate-45 transition-transform duration-500'} />
          <span className="font-medium">Cài đặt</span>
        </Link>
        <button className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-red-500 hover:bg-red-50 transition-all">
          <LogOut size={20} />
          <span className="font-medium">Đăng xuất</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
