'use client';

import React, { Suspense, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Villa, Booking } from '@/types';
import { ChevronLeft, ChevronRight, Plus, Wrench, LogOut, LogIn, Loader2 } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

const CalendarPageContent = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { profile, loading: authLoading } = useAuth();

  const [villas, setVillas] = useState<Villa[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  // Đọc trạng thái từ URL params để giữ nguyên khi Back từ trang chi tiết
  const now = new Date();
  const urlVillaId = searchParams.get('villaId');
  const urlMonth = parseInt(searchParams.get('month') || String(now.getMonth() + 1));
  const urlYear = parseInt(searchParams.get('year') || String(now.getFullYear()));

  const [selectedVillaId, setSelectedVillaId] = useState<string | null>(urlVillaId);
  const [currentDate, setCurrentDate] = useState(new Date(urlYear, urlMonth - 1, 1));

  // Cập nhật URL khi thay đổi villa hoặc tháng (dùng replace để không thêm history entry mới)
  const updateUrl = useCallback((villaId: string | null, date: Date) => {
    const params = new URLSearchParams();
    if (villaId) params.set('villaId', villaId);
    params.set('month', String(date.getMonth() + 1));
    params.set('year', String(date.getFullYear()));
    router.replace(`/calendar?${params.toString()}`, { scroll: false });
  }, [router]);

  useEffect(() => {
    if (profile?.tenant_id) {
      fetchInitialData();
    }
  }, [profile]);

  useEffect(() => {
    if (selectedVillaId) {
      fetchBookings();
    }
  }, [currentDate, selectedVillaId]);

  const fetchInitialData = async () => {
    if (!profile?.tenant_id) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('villas')
        .select('*')
        .eq('tenant_id', profile.tenant_id)
        .neq('status', 'inactive');

      if (error) throw error;
      if (data && data.length > 0) {
        setVillas(data);
        // Ưu tiên dùng villaId từ URL nếu còn hợp lệ, không thì dùng villa đầu tiên
        const defaultVillaId = urlVillaId && data.find(v => v.id === urlVillaId)
          ? urlVillaId
          : data[0].id;
        setSelectedVillaId(defaultVillaId);
        updateUrl(defaultVillaId, currentDate);
      }
    } catch (error) {
      console.error('Error fetching villas:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchBookings = async () => {
    if (!profile?.tenant_id) return;
    try {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;
      const firstDay = `${year}-${String(month).padStart(2, '0')}-01`;
      const lastDay = `${year}-${String(month).padStart(2, '0')}-${new Date(year, month, 0).getDate()}`;

      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('villa_id', selectedVillaId)
        .eq('tenant_id', profile.tenant_id)
        .not('status', 'in', '("cancelled", "deleted")')
        .or(`check_in.lte.${lastDay},check_out.gte.${firstDay}`);

      if (error) throw error;
      setBookings(data || []);
    } catch (error) {
      console.error('Error fetching bookings:', error);
    }
  };

  const handleVillaChange = (villaId: string) => {
    setSelectedVillaId(villaId);
    updateUrl(villaId, currentDate);
  };

  const handleMonthChange = (delta: number) => {
    const newDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + delta, 1);
    setCurrentDate(newDate);
    updateUrl(selectedVillaId, newDate);
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const days = [];
    const startPadding = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;

    for (let i = 0; i < startPadding; i++) {
      const d = new Date(year, month, -i);
      days.unshift({ date: d, isCurrentMonth: false });
    }

    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push({ date: new Date(year, month, i), isCurrentMonth: true });
    }

    return days;
  };

  const days = getDaysInMonth(currentDate);

  const formatDateLocal = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const getDailyBookings = (date: Date) => {
    const dateStr = formatDateLocal(date);
    return {
      checkingIn: bookings.find(b => b.check_in === dateStr),
      checkingOut: bookings.find(b => b.check_out === dateStr),
      staying: bookings.find(b => dateStr > b.check_in && dateStr < b.check_out)
    };
  };

  if (authLoading) return null;

  if (loading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <Loader2 className="text-orange-500 animate-spin" size={48} />
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6 animate-in fade-in duration-700 pb-16 mt-6 md:mt-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold text-slate-900">Lịch điều phối</h1>
          <p className="text-slate-500 font-medium text-xs">Dữ liệu thời gian thực từ hệ thống.</p>
        </div>
        <div className="flex bg-white border border-slate-200 rounded-xl md:rounded-2xl p-1 md:p-1.5 shadow-sm self-start md:self-auto">
          <button onClick={() => handleMonthChange(-1)} className="p-1.5 md:p-2 hover:bg-slate-50 rounded-lg md:rounded-xl text-slate-400 transition-colors">
            <ChevronLeft size={18} />
          </button>
          <div className="px-3 md:px-6 flex items-center font-semibold text-slate-900 min-w-[140px] md:min-w-[180px] justify-center text-sm">
            Tháng {currentDate.getMonth() + 1}, {currentDate.getFullYear()}
          </div>
          <button onClick={() => handleMonthChange(1)} className="p-1.5 md:p-2 hover:bg-slate-50 rounded-lg md:rounded-xl text-slate-400 transition-colors">
            <ChevronRight size={18} />
          </button>
        </div>
      </header>

      {/* Villa Tabs Selection */}
      <div className="flex gap-2 md:gap-4 overflow-x-auto pb-1 custom-scrollbar border-b border-slate-100">
        {villas.map((villa) => {
          const isSelected = selectedVillaId === villa.id;
          const isMaintenance = villa.status === 'maintenance';
          return (
            <button
              key={villa.id}
              disabled={isMaintenance}
              onClick={() => handleVillaChange(villa.id)}
              className={`flex-shrink-0 px-4 md:px-6 py-2.5 md:py-3 rounded-t-xl md:rounded-t-2xl font-semibold text-sm transition-all border-b-2 md:border-b-4 flex items-center gap-2 ${isSelected
                  ? 'border-orange-500 text-slate-900 bg-orange-50/20'
                  : isMaintenance
                    ? 'border-transparent text-slate-300 cursor-not-allowed opacity-50 grayscale'
                    : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
            >
              {isMaintenance && <Wrench size={14} />}
              {villa.name}
            </button>
          );
        })}
      </div>

      {villas.length > 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl md:rounded-3xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto custom-scrollbar">
            <div className="min-w-[700px]">
              {/* Header T2-CN */}
              <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50/50">
                {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map(day => (
                  <div key={day} className="py-2.5 md:py-3 text-center text-xs font-semibold text-slate-400">{day}</div>
                ))}
              </div>

              {/* Grid các ngày */}
              <div className="grid grid-cols-7">
                {days.map((day, idx) => {
                  const { checkingIn, checkingOut, staying } = getDailyBookings(day.date);
                  const isToday = day.date.toDateString() === new Date().toDateString();
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  const isPast = day.date < today;

                  return (
                    <div
                      key={idx}
                      className={`min-h-[110px] md:min-h-[140px] border-r border-b border-slate-50 p-1.5 md:p-2 transition-colors relative group ${!day.isCurrentMonth ? 'bg-slate-50/30' : isPast ? 'bg-slate-50/10' : 'hover:bg-slate-50/50'}`}
                    >
                      <div className="flex justify-between items-center h-6 md:h-8 mb-1 md:mb-2">
                        <span className={`text-xs md:text-sm font-semibold ${!day.isCurrentMonth ? 'text-slate-200' : isToday ? 'text-orange-500 bg-orange-50 px-1.5 py-0.5 rounded-md' : isPast ? 'text-slate-300' : 'text-slate-400'}`}>
                          {day.date.getDate()}
                        </span>
                        {day.isCurrentMonth && !checkingIn && !staying && !isPast && (
                          <button
                            onClick={() => router.push(`/bookings/create?villaId=${selectedVillaId}&date=${formatDateLocal(day.date)}`)}
                            className="p-1 bg-slate-100 text-slate-400 cursor-pointer rounded-md md:rounded-lg transition-all hover:bg-slate-900 hover:text-white"
                          >
                            <Plus size={12} />
                          </button>
                        )}
                      </div>

                      <div className="space-y-1">
                        {checkingOut && (
                          <div
                            onClick={() => router.push(`/bookings/${checkingOut.id}`)}
                            className="p-1 md:p-1.5 bg-slate-50 text-slate-500 rounded-lg md:rounded-xl cursor-pointer border border-slate-100 hover:border-red-300 hover:bg-red-50 transition-all"
                          >
                            <div className="flex items-center gap-1 text-[8px] font-semibold opacity-60 mb-0.5">
                              <LogOut size={8} className="md:w-2.5 md:h-2.5" /> Trả (12h)
                            </div>
                            <p className="font-semibold text-[10px] truncate leading-tight">{checkingOut.customer_name}</p>
                          </div>
                        )}

                        {staying && (
                          <div
                            onClick={() => router.push(`/bookings/${staying.id}`)}
                            className={`p-1 md:p-1.5 rounded-lg md:rounded-xl cursor-pointer transition-all hover:scale-[1.02] shadow-sm ${staying.status === 'checked_in' ? 'bg-indigo-600 text-white' : 'bg-emerald-500 text-white'} ${isPast ? 'opacity-50' : ''}`}
                          >
                            <div className="flex items-center gap-1 text-[8px] font-semibold opacity-70 mb-0.5">
                              {staying.status === 'checked_in' ? (
                                <><div className="w-1 md:w-1.5 h-1 md:h-1.5 rounded-full bg-white animate-pulse"></div> Đang ở</>
                              ) : (
                                <><div className="w-1 md:w-1.5 h-1 md:h-1.5 rounded-full bg-white/50"></div> Đã đặt</>
                              )}
                            </div>
                            <p className="font-semibold text-[10px] truncate leading-tight">{staying.customer_name}</p>
                          </div>
                        )}

                        {checkingIn && (
                          <div
                            onClick={() => router.push(`/bookings/${checkingIn.id}`)}
                            className={`p-1 md:p-1.5 rounded-lg md:rounded-xl cursor-pointer transition-all hover:scale-[1.02] shadow-sm ${checkingIn.status === 'checked_in' ? 'bg-indigo-600 text-white' : 'bg-emerald-500 text-white'} ${isPast ? 'opacity-50' : ''}`}
                          >
                            <div className="flex items-center gap-1 text-[8px] font-semibold opacity-70 mb-0.5">
                              <LogIn size={8} className="md:w-2.5 md:h-2.5" /> {checkingIn.status === 'checked_in' ? 'Đang ở' : 'Nhận (14h)'}
                            </div>
                            <p className="font-semibold text-[10px] truncate leading-tight">{checkingIn.customer_name}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="py-20 text-center bg-white border border-slate-200 rounded-[2.5rem]">
          <p className="text-slate-400 font-semibold text-xs">Chưa có Villa nào để hiển thị lịch</p>
        </div>
      )}
    </div>
  );
};

const CalendarPage = () => {
  return (
    <Suspense
      fallback={(
        <div className="min-h-[80vh] flex items-center justify-center">
          <Loader2 className="text-orange-500 animate-spin" size={48} />
        </div>
      )}
    >
      <CalendarPageContent />
    </Suspense>
  );
};

export default CalendarPage;
