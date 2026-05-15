'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Villa, Booking } from '@/types';
import { Users, DollarSign, CalendarCheck, TrendingUp, ChevronRight, ImageIcon, BarChart3, Loader2, Wallet } from 'lucide-react';
import { getOptimizedImageUrl } from '@/lib/utils';
import Link from 'next/link';

const DashboardPage = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [villas, setVillas] = useState<Villa[]>([]);
  const [allBookings, setAllBookings] = useState<Booking[]>([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const { data: villasData } = await supabase.from('villas').select('*').neq('status', 'inactive');
      const { data: allBookingsData } = await supabase.from('bookings').select('*').neq('status', 'cancelled');
      setVillas(villasData || []);
      setAllBookings(allBookingsData || []);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalExpectedRevenue = useMemo(() => {
    return allBookings.reduce((sum, booking) => sum + (Number(booking.total_amount) || 0), 0);
  }, [allBookings]);

  const actualRevenue = useMemo(() => {
    return allBookings.reduce((sum, booking) => {
      if (booking.status === 'deposited') return sum + (Number(booking.deposit_amount) || 0);
      return sum + (Number(booking.total_amount) || 0);
    }, 0);
  }, [allBookings]);

  // Tỷ lệ lấp đầy theo THÁNG HIỆN TẠI
  const occupancyRate = useMemo(() => {
    if (villas.length === 0) return 0;
    
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    
    const totalPossibleNights = villas.length * daysInMonth;
    let bookedNights = 0;

    allBookings.forEach(booking => {
      const bIn = new Date(booking.check_in);
      const bOut = new Date(booking.check_out);
      
      // Chỉ tính những ngày nằm trong tháng hiện tại
      const monthStart = new Date(currentYear, currentMonth, 1);
      const monthEnd = new Date(currentYear, currentMonth + 1, 1);
      
      const start = new Date(Math.max(monthStart.getTime(), bIn.getTime()));
      const end = new Date(Math.min(monthEnd.getTime(), bOut.getTime()));
      
      if (start < end) {
        const nights = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        bookedNights += nights;
      }
    });

    return Math.min(Math.round((bookedNights / totalPossibleNights) * 100), 100);
  }, [villas, allBookings]);

  const weeklyRevenueData = useMemo(() => {
    const days = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
    const result = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayName = days[d.getDay()];
      const dayTotal = allBookings
        .filter(b => b.created_at?.startsWith(dateStr))
        .reduce((sum, b) => b.status === 'deposited' ? sum + (Number(b.deposit_amount) || 0) : sum + (Number(b.total_amount) || 0), 0);
      result.push({ day: dayName, amount: dayTotal });
    }
    return result;
  }, [allBookings]);

  const maxRevenue = Math.max(...weeklyRevenueData.map(d => d.amount), 1);

  const stats = [
    { label: 'Thực thu (Tiền mặt)', value: `${actualRevenue.toLocaleString()}đ`, icon: Wallet, color: 'bg-emerald-600' },
    { label: 'Dự kiến (Tổng đơn)', value: `${totalExpectedRevenue.toLocaleString()}đ`, icon: DollarSign, color: 'bg-blue-600' },
    { label: 'Lấp đầy tháng này', value: `${occupancyRate}%`, icon: TrendingUp, color: 'bg-orange-600' },
    { label: 'Tổng Villa', value: villas.length, icon: Users, color: 'bg-indigo-600' },
  ];

  if (loading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <Loader2 className="text-orange-500 animate-spin" size={48} />
      </div>
    );
  }

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-700 pb-10 md:pb-16 px-4">
      <header>
        <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tighter">Báo cáo hôm nay 👋</h1>
      </header>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
        {stats.map((stat, idx) => (
          <div key={idx} className="bg-white p-4 md:p-5 rounded-2xl md:rounded-3xl border border-slate-200 hover:shadow-lg transition-all group">
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-slate-500 text-[8px] md:text-[10px] font-black uppercase tracking-widest truncate">{stat.label}</p>
                <p className="text-base md:text-xl font-black mt-0.5 text-slate-900 tracking-tight truncate">{stat.value}</p>
              </div>
              <div className={`${stat.color} p-2 md:p-3 rounded-xl md:rounded-2xl shadow-md flex-shrink-0 ml-2`}>
                <stat.icon size={18} className="text-white md:w-5 md:h-5" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl md:rounded-[2.5rem] p-5 md:p-8 shadow-sm">
          <div className="flex items-center justify-between mb-6 md:mb-8">
            <h2 className="text-lg md:text-xl font-black text-slate-900 flex items-center gap-2">
              <BarChart3 className="text-orange-500" size={20} /> Dòng tiền 7 ngày
            </h2>
          </div>
          <div className="h-[200px] md:h-[250px] flex items-end justify-between gap-2 md:gap-4 px-2 relative">
            {weeklyRevenueData.map((data, idx) => {
              const height = (data.amount / maxRevenue) * 100;
              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-3 group relative h-full justify-end">
                  {data.amount > 0 && (
                    <div className="absolute bottom-[20%] mb-10 opacity-0 group-hover:opacity-100 transition-all bg-slate-900 text-white text-[9px] font-black py-1.5 px-2 rounded-lg pointer-events-none z-10 whitespace-nowrap">
                      {data.amount.toLocaleString()}đ
                    </div>
                  )}
                  <div style={{ height: `${Math.max(height, 5)}%` }} className={`w-full max-w-[32px] rounded-t-lg md:rounded-t-xl transition-all duration-700 ${data.amount > 0 ? 'bg-orange-500' : 'bg-slate-50'}`}></div>
                  <span className="text-[8px] md:text-[9px] font-black text-slate-400 uppercase tracking-widest">{data.day}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl md:rounded-[2.5rem] p-5 md:p-8 shadow-sm flex flex-col">
          <h2 className="text-lg md:text-xl font-black text-slate-900 mb-6 md:mb-8 flex items-center gap-2.5">
            <div className="w-1.5 h-6 bg-indigo-500 rounded-full"></div> Villa hệ thống
          </h2>
          <div className="space-y-3 md:space-y-4">
            {villas.slice(0, 5).map((villa) => (
              <div key={villa.id} onClick={() => router.push(`/villas/${villa.id}`)} className="flex gap-3 md:gap-4 items-center group cursor-pointer p-3 hover:bg-slate-50 rounded-xl md:rounded-2xl transition-all border border-transparent hover:border-slate-100">
                <div className="overflow-hidden rounded-lg md:rounded-xl w-10 h-10 md:w-12 md:h-12 shadow-sm flex-shrink-0 bg-slate-50 border border-slate-100">
                  {villa.images && villa.images.length > 0 ? (
                    <img src={getOptimizedImageUrl(villa.images[0], 150)} alt={villa.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-200"><Users size={18} /></div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-black text-xs md:text-sm truncate text-slate-900 leading-tight">{villa.name}</h3>
                  <div className="mt-0.5 flex items-center gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${villa.status === 'active' ? 'bg-emerald-500' : 'bg-orange-500'}`}></span>
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-tight">{villa.status === 'active' ? 'Hoạt động' : 'Bảo trì'}</span>
                  </div>
                </div>
                <ChevronRight size={16} className="text-slate-200 group-hover:text-slate-900 transition-colors" />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl md:rounded-[2.5rem] p-5 md:p-8 shadow-sm">
        <div className="flex items-center justify-between mb-6 md:mb-8">
          <h2 className="text-lg md:text-xl font-black text-slate-900 flex items-center gap-2.5">
            <div className="w-1.5 h-6 bg-blue-500 rounded-full"></div> Đơn mới nhất
          </h2>
          <Link href="/bookings" className="text-slate-900 text-[9px] md:text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 border border-slate-200 px-4 md:px-5 py-2 md:py-2.5 rounded-xl transition-all flex items-center gap-2 shadow-sm">
            Quản lý <ChevronRight size={14} />
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[600px] md:min-w-0">
            <thead>
              <tr className="text-slate-400 text-[9px] md:text-[10px] border-b border-slate-100 uppercase tracking-widest font-black">
                <th className="pb-4 pl-2">Khách hàng</th>
                <th className="pb-4">Villa</th>
                <th className="pb-4">Ngày</th>
                <th className="pb-4">Trạng thái</th>
                <th className="pb-4 text-right pr-2">Tổng tiền</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {allBookings.slice(0, 5).map((booking) => {
                const villa = villas.find(v => v.id === booking.villa_id);
                return (
                  <tr key={booking.id} onClick={() => router.push(`/bookings/${booking.id}`)} className="group hover:bg-slate-50 transition-colors cursor-pointer">
                    <td className="py-4 pl-2">
                      <p className="font-black text-slate-900 text-sm leading-tight">{booking.customer_name}</p>
                    </td>
                    <td className="py-4 text-slate-600 font-bold text-xs md:text-sm">{villa?.name}</td>
                    <td className="py-4 text-slate-500 font-medium text-[10px] md:text-xs">{booking.check_in} → {booking.check_out}</td>
                    <td className="py-4">
                      <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${booking.status === 'deposited' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-indigo-50 text-indigo-600 border-indigo-100'}`}>
                        {booking.status === 'deposited' ? 'Đã cọc' : 'Đang ở'}
                      </span>
                    </td>
                    <td className="py-4 text-right font-black text-slate-900 pr-2 text-sm md:text-base">{Number(booking.total_amount).toLocaleString()}đ</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
