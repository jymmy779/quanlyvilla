'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Calendar, DollarSign, Hotel, Settings, LogOut, Menu, X } from 'lucide-react';

const MobileNav = () => {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const mainItems = [
    { name: 'Tổng quan', href: '/', icon: LayoutDashboard },
    { name: 'Lịch', href: '/calendar', icon: Calendar },
    { name: 'Giá', href: '/pricing', icon: DollarSign },
    { name: 'Villa', href: '/villas', icon: Hotel },
  ];

  const moreItems = [
    { name: 'Cài đặt', href: '/settings', icon: Settings },
    { name: 'Đăng xuất', icon: LogOut, isAction: true },
  ];

  return (
    <>
      {/* Overlay Menu */}
      {isOpen && (
        <div 
          className="xl:hidden fixed inset-0 bg-slate-900/40 backdrop-blur-[2px] z-[49] transition-all duration-300"
          onClick={() => setIsOpen(false)}
        >
          <div 
            className="absolute bottom-24 right-4 bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-slate-100 p-2 min-w-[180px] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-3 py-2 border-b border-slate-50 mb-1">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tài khoản</span>
            </div>
            {moreItems.map((item) => (
              item.isAction ? (
                <button
                  key={item.name}
                  className="flex items-center gap-3 w-full px-4 py-3 text-red-500 hover:bg-red-50 rounded-xl transition-colors group"
                  onClick={() => {
                    // Handle logout logic here
                    setIsOpen(false);
                  }}
                >
                  <div className="bg-red-50 p-2 rounded-lg group-hover:bg-red-100 transition-colors">
                    <item.icon size={18} />
                  </div>
                  <span className="font-semibold text-sm">{item.name}</span>
                </button>
              ) : (
                <Link
                  key={item.href}
                  href={item.href!}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors group ${
                    pathname === item.href ? 'bg-orange-50 text-orange-600' : 'text-slate-600 hover:bg-slate-50'
                  }`}
                  onClick={() => setIsOpen(false)}
                >
                  <div className={`p-2 rounded-lg transition-colors ${
                    pathname === item.href ? 'bg-orange-100' : 'bg-slate-50 group-hover:bg-slate-100'
                  }`}>
                    <item.icon size={18} />
                  </div>
                  <span className="font-semibold text-sm">{item.name}</span>
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
