'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Booking, Villa } from '@/types';
import { Search, Filter, Calendar, Users, ChevronRight, Loader2, ArrowLeft } from 'lucide-react';

const BookingsListPage = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [villas, setVillas] = useState<Villa[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [bookingsRes, villasRes] = await Promise.all([
        supabase.from('bookings').select('*').order('check_in', { ascending: false }),
        supabase.from('villas').select('*')
      ]);

      if (bookingsRes.error) throw bookingsRes.error;
      if (villasRes.error) throw villasRes.error;

      setBookings(bookingsRes.data || []);
      setVillas(villasRes.data || []);
    } catch (error) {
      console.error('Error fetching bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredBookings = bookings.filter(b => {
    const matchesSearch = b.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          b.customer_phone.includes(searchTerm);
    const matchesStatus = statusFilter === 'all' || b.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'deposited': return { label: 'Đã cọc', color: 'bg-emerald-50 text-emerald-600 border-emerald-100' };
      case 'checked_in': return { label: 'Đang ở', color: 'bg-indigo-50 text-indigo-600 border-indigo-100' };
      case 'completed': return { label: 'Hoàn thành', color: 'bg-blue-50 text-blue-600 border-blue-100' };
      case 'cancelled': return { label: 'Đã hủy', color: 'bg-red-50 text-red-600 border-red-100' };
      default: return { label: 'Chờ cọc', color: 'bg-slate-50 text-slate-400 border-slate-100' };
    }
  };

  if (loading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <Loader2 className="text-orange-500 animate-spin" size={48} />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Danh sách Đơn đặt</h1>
          <p className="text-slate-500 font-medium">Theo dõi và quản lý toàn bộ luồng khách hàng từ Supabase.</p>
        </div>
      </header>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm">
        <div className="md:col-span-2 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Tìm theo tên khách hoặc SĐT..." 
            className="w-full bg-slate-50 border-none rounded-2xl py-4 pl-12 pr-4 font-bold outline-none focus:ring-2 focus:ring-orange-500 transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <select 
            className="w-full bg-slate-50 border-none rounded-2xl py-4 pl-12 pr-4 font-bold outline-none focus:ring-2 focus:ring-orange-500 appearance-none transition-all"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="deposited">Đã cọc</option>
            <option value="checked_in">Đang ở</option>
            <option value="completed">Hoàn thành</option>
            <option value="cancelled">Đã hủy</option>
          </select>
        </div>
      </div>

      {/* Booking List */}
      <div className="bg-white border border-slate-200 rounded-[2.5rem] overflow-hidden shadow-sm">
        {filteredBookings.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50 text-slate-400 text-[10px] border-b border-slate-100 uppercase tracking-widest font-black">
                  <th className="py-5 pl-8">Khách hàng</th>
                  <th className="py-5">Villa</th>
                  <th className="py-5">Thời gian</th>
                  <th className="py-5">Trạng thái</th>
                  <th className="py-5 text-right pr-8">Tổng tiền</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredBookings.map((booking) => {
                  const villa = villas.find(v => v.id === booking.villa_id);
                  const status = getStatusLabel(booking.status);
                  return (
                    <tr 
                      key={booking.id} 
                      onClick={() => router.push(`/bookings/${booking.id}`)}
                      className="group hover:bg-slate-50/80 transition-all cursor-pointer"
                    >
                      <td className="py-6 pl-8">
                        <p className="font-black text-slate-900">{booking.customer_name}</p>
                        <p className="text-slate-400 text-xs font-bold mt-0.5">{booking.customer_phone}</p>
                      </td>
                      <td className="py-6">
                        <span className="font-bold text-slate-700 text-sm">{villa?.name || 'N/A'}</span>
                      </td>
                      <td className="py-6">
                        <div className="flex items-center gap-2 text-slate-500 font-medium text-xs">
                          <span className="bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">{booking.check_in}</span>
                          <span className="text-slate-200">→</span>
                          <span className="bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">{booking.check_out}</span>
                        </div>
                      </td>
                      <td className="py-6">
                        <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${status.color}`}>
                          {status.label}
                        </span>
                      </td>
                      <td className="py-6 text-right pr-8">
                        <p className="font-black text-slate-900 text-lg">{Number(booking.total_amount).toLocaleString()}đ</p>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-32 flex flex-col items-center justify-center space-y-4 text-center">
            <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center text-slate-200">
               <Calendar size={40} />
            </div>
            <div className="space-y-1">
              <p className="text-slate-900 font-black text-lg">Không tìm thấy đơn đặt nào</p>
              <p className="text-slate-400 text-sm font-medium">Hãy thử điều chỉnh lại bộ lọc hoặc từ khóa tìm kiếm.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BookingsListPage;
