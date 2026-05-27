'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Villa } from '@/types';
import { DollarSign, Save, ChevronLeft, ChevronRight, TrendingUp, Info, AlertCircle, Loader2, Calendar as CalendarIcon } from 'lucide-react';
import { useNotification } from '@/context/NotificationContext';
import { useAuth } from '@/context/AuthContext';

const PricingPage = () => {
  const { role } = useAuth();
  const isAdmin = role === 'admin';
  const [villas, setVillas] = useState<Villa[]>([]);
  const [selectedVillaId, setSelectedVillaId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [monthlyPrices, setMonthlyPrices] = useState<any[]>([]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [editingValue, setEditingValue] = useState<{ key: string; val: string } | null>(null);
  const { showToast } = useNotification();

  useEffect(() => {
    fetchVillas();
  }, []);

  const fetchVillas = async () => {
    console.log('[PricingPage] 🚀 Bắt đầu fetchVillas...');
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('villas')
        .select('*')
        .neq('status', 'inactive');

      if (error) {
        console.error('[PricingPage] ❌ Lỗi khi tải danh sách Villa:', error);
        throw error;
      }
      
      console.log('[PricingPage] 🎉 Tải danh sách Villa thành công, số lượng:', data?.length);
      if (data && data.length > 0) {
        setVillas(data);
        setSelectedVillaId(data[0].id);
        setMonthlyPrices(data[0].monthly_prices || []);
      }
    } catch (error) {
      console.error('[PricingPage] 💥 Lỗi bắt ngoại lệ fetchVillas:', error);
    } finally {
      console.log('[PricingPage] 🏁 Hoàn thành fetchVillas (finally block)');
      setLoading(false);
    }
  };

  const selectedVilla = villas.find(v => v.id === selectedVillaId);

  useEffect(() => {
    if (selectedVilla) {
      setMonthlyPrices(selectedVilla.monthly_prices || []);
    }
  }, [selectedVillaId]);

  const getPriceForMonth = (month: number) => {
    return monthlyPrices.find(p => p.month === month && p.year === selectedYear);
  };

  const handlePriceChange = (month: number, type: 'weekday' | 'weekend', inputVal: string, inputElement: HTMLInputElement) => {
    const key = `${month}-${type}`;
    
    // Đếm số chữ số trước con trỏ để giữ vị trí
    const cursorPosition = inputElement.selectionStart || 0;
    const digitsBeforeCursor = inputVal.substring(0, cursorPosition).replace(/\D/g, '').length;

    // Manual VN Formatter: Thêm dấu chấm nhưng KHÔNG ép kiểu Number sớm (để giữ số 0 ở đầu)
    const digits = inputVal.replace(/\D/g, '');
    const formattedVal = digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");

    setEditingValue({ key, val: formattedVal });

    // Cập nhật giá trị số thực tế cho hệ thống
    const amount = digits === '' ? 0 : Number(digits);
    
    const newPrices = [...monthlyPrices];
    const index = newPrices.findIndex(p => p.month === month && p.year === selectedYear);
    
    if (index >= 0) {
      if (type === 'weekday') newPrices[index].weekday_price = amount;
      else newPrices[index].weekend_price = amount;
    } else {
      const newItem: any = { 
        month, 
        year: selectedYear,
        weekday_price: type === 'weekday' ? amount : 5000000,
        weekend_price: type === 'weekend' ? amount : 7000000
      };
      newPrices.push(newItem);
    }
    setMonthlyPrices(newPrices);

    // Khôi phục con trỏ thông minh
    setTimeout(() => {
      let newPos = 0;
      let digitsFound = 0;
      for (let i = 0; i < formattedVal.length && digitsFound < digitsBeforeCursor; i++) {
        if (/\d/.test(formattedVal[i])) digitsFound++;
        newPos = i + 1;
      }
      inputElement.setSelectionRange(newPos, newPos);
    }, 0);
  };

  const handleSave = async () => {
    if (!selectedVillaId) return;
    try {
      setSaving(true);
      const { error } = await supabase
        .from('villas')
        .update({ monthly_prices: monthlyPrices })
        .eq('id', selectedVillaId);

      if (error) throw error;
      
      setVillas(villas.map(v => v.id === selectedVillaId ? { ...v, monthly_prices: monthlyPrices } : v));
      showToast(`Đã cập nhật thành công bảng giá năm ${selectedYear}!`);
    } catch (error) {
      console.error(error);
      showToast('Lỗi khi lưu bảng giá!', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <Loader2 className="text-orange-500 animate-spin" size={48} />
      </div>
    );
  }

  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-700 pb-10 md:pb-16 px-4 mt-6 md:mt-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-8">
           <div>
            <h1 className="text-xl md:text-2xl font-semibold text-slate-900">Cấu hình giá</h1>
            <p className="text-slate-500 font-medium text-sm">Quản lý giá theo loại ngày (Thường/Cuối tuần).</p>
          </div>
          
          <div className="flex items-center bg-white border border-slate-200 rounded-xl md:rounded-2xl p-1 shadow-sm self-start">
            <button onClick={() => setSelectedYear(selectedYear - 1)} className="p-1.5 md:p-2 hover:bg-slate-50 text-slate-400 hover:text-slate-900 transition-all rounded-lg md:rounded-xl"><ChevronLeft size={18} /></button>
            <div className="px-4 md:px-6 py-1 flex flex-col items-center">
              <span className="text-xs font-semibold text-orange-500 leading-none mb-0.5">Năm</span>
              <span className="text-base md:text-lg font-semibold text-slate-900 leading-none">{selectedYear}</span>
            </div>
            <button onClick={() => setSelectedYear(selectedYear + 1)} className="p-1.5 md:p-2 hover:bg-slate-50 text-slate-400 hover:text-slate-900 transition-all rounded-lg md:rounded-xl"><ChevronRight size={18} /></button>
          </div>
        </div>

        {isAdmin ? (
          <button 
            onClick={handleSave}
            disabled={saving || !selectedVillaId}
            className="bg-slate-900 text-white hover:bg-emerald-600 px-6 md:px-8 py-2.5 md:py-3.5 rounded-xl md:rounded-2xl font-semibold text-sm shadow-lg flex items-center justify-center gap-2.5 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
            Lưu bảng giá {selectedYear}
          </button>
        ) : (
          <div className="bg-orange-50 border border-orange-100 text-orange-700 px-4 py-2.5 rounded-xl flex items-center gap-2 text-xs font-bold">
            <AlertCircle size={14} className="text-orange-500" />
            Chế độ Chỉ xem (Read-only)
          </div>
        )}
      </header>

      {/* Villa Tabs */}
      <div className="flex gap-2 md:gap-4 overflow-x-auto pb-2 custom-scrollbar border-b border-slate-100">
        {villas.map((villa) => (
          <button
            key={villa.id}
            onClick={() => setSelectedVillaId(villa.id)}
            className={`flex-shrink-0 px-4 md:px-6 py-2 md:py-3 rounded-t-xl md:rounded-t-2xl font-semibold text-sm transition-all border-b-2 md:border-b-4 ${
              selectedVillaId === villa.id 
                ? 'border-orange-500 bg-orange-50/20 text-orange-600' 
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            {villa.name}
          </button>
        ))}
      </div>

      {selectedVilla && (
        <div className="bg-white border border-slate-200 rounded-2xl md:rounded-3xl p-4 md:p-8 shadow-sm overflow-hidden w-full">
          <table className="w-full text-left">
            <thead>
              <tr className="text-slate-400 text-sm border-b border-slate-100 font-semibold">
                <th className="pb-4 pl-2">Tháng</th>
                <th className="pb-4 hidden md:table-cell">Mùa vụ</th>
                <th className="pb-4 text-center">Giá Ngày Thường</th>
                <th className="pb-4 text-center">Giá Cuối Tuần</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {months.map((month) => {
                const seasonal = getPriceForMonth(month);
                const isPeak = [6, 7, 8].includes(month);
                const now = new Date();
                const currentMonth = now.getMonth() + 1;
                const currentYear = now.getFullYear();
                const isPast = selectedYear < currentYear || (selectedYear === currentYear && month < currentMonth);
                
                // Hiển thị giá từ DB, nếu chưa có thì dùng mặc định
                const displayWeekday = seasonal ? seasonal.weekday_price.toLocaleString('vi-VN') : (isPast ? '' : '5.000.000');
                const displayWeekend = seasonal ? seasonal.weekend_price.toLocaleString('vi-VN') : (isPast ? '' : '7.000.000');

                return (
                  <tr key={month} className={`group ${isPast ? 'opacity-40' : ''} hover:bg-slate-50 transition-colors`}>
                    <td className="py-4 pl-2">
                      <span className="font-semibold text-slate-900 text-sm md:text-lg leading-tight">T{month}</span>
                      <p className="text-xs text-slate-400 font-medium">{selectedYear}</p>
                    </td>
                    <td className="py-4 hidden md:table-cell">
                      {isPeak ? (
                        <span className="bg-red-50 text-red-600 px-2 py-0.5 rounded text-xs font-semibold border border-red-100">Cao điểm</span>
                      ) : (
                        <span className="bg-slate-50 text-slate-400 px-2 py-0.5 rounded text-xs font-semibold border border-slate-100">Thường</span>
                      )}
                    </td>
                    <td className="py-4 px-2 md:px-4">
                      <div className={`flex items-center justify-center gap-1.5 md:gap-2 border rounded-lg md:rounded-2xl p-0.5 md:p-1 transition-all ${
                        !isAdmin 
                          ? 'bg-slate-50/60 border-slate-100 cursor-not-allowed' 
                          : 'bg-white border-slate-100 focus-within:ring-2 focus-within:ring-orange-500'
                      }`}>
                        <span className="pl-1.5 md:pl-3 text-slate-300 font-semibold text-sm">đ</span>
                        <input 
                          type="text" 
                          disabled={isPast || !isAdmin}
                          className={`bg-transparent border-none py-2 md:py-3 text-right font-semibold w-full outline-none text-sm ${
                            !isAdmin ? 'text-slate-400 cursor-not-allowed' : 'text-slate-900'
                          }`}
                          value={editingValue?.key === `${month}-weekday` ? editingValue.val : displayWeekday}
                          onFocus={() => setEditingValue({ key: `${month}-weekday`, val: displayWeekday })}
                          onBlur={() => setEditingValue(null)}
                          onChange={(e) => handlePriceChange(month, 'weekday', e.target.value, e.target)}
                        />
                      </div>
                    </td>
                    <td className="py-4 px-2 md:px-4">
                      <div className={`flex items-center justify-center gap-1.5 md:gap-2 border rounded-lg md:rounded-2xl p-0.5 md:p-1 transition-all ${
                        !isAdmin 
                          ? 'bg-slate-50/60 border-slate-100 cursor-not-allowed' 
                          : 'bg-indigo-50/50 border-indigo-100 focus-within:ring-2 focus-within:ring-indigo-500'
                      }`}>
                        <span className="pl-1.5 md:pl-3 text-indigo-300 font-semibold text-sm">đ</span>
                        <input 
                          type="text" 
                          disabled={isPast || !isAdmin}
                          className={`bg-transparent border-none py-2 md:py-3 text-right font-semibold w-full outline-none text-sm ${
                            !isAdmin ? 'text-slate-400 cursor-not-allowed' : 'text-indigo-600'
                          }`}
                          value={editingValue?.key === `${month}-weekend` ? editingValue.val : displayWeekend}
                          onFocus={() => setEditingValue({ key: `${month}-weekend`, val: displayWeekend })}
                          onBlur={() => setEditingValue(null)}
                          onChange={(e) => handlePriceChange(month, 'weekend', e.target.value, e.target)}
                        />
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
  );
};

export default PricingPage;
