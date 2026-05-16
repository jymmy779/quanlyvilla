'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Calendar, DollarSign, Hotel } from 'lucide-react';

const MobileNav = () => {
  const pathname = usePathname();

  const menuItems = [
    { name: 'Tổng quan', href: '/', icon: LayoutDashboard },
    { name: 'Lịch', href: '/calendar', icon: Calendar },
    { name: 'Giá', href: '/pricing', icon: DollarSign },
    { name: 'Villa', href: '/villas', icon: Hotel },
  ];

  return (
    <nav className="xl:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-50 px-6 py-3 flex justify-between items-center shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
      {menuItems.map((item) => {
        const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center gap-1 transition-all duration-300 ${
              isActive ? 'text-orange-600' : 'text-slate-400'
            }`}
          >
            <div className={`p-1 rounded-lg ${isActive ? 'bg-orange-50' : ''}`}>
              <item.icon size={22} strokeWidth={isActive ? 2.5 : 2} />
            </div>
            <span className={`text-[10px] font-semibold ${isActive ? 'opacity-100' : 'opacity-60'}`}>
              {item.name}
            </span>
          </Link>
        );
      })}
    </nav>
  );
};

export default MobileNav;
