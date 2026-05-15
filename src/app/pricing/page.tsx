'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Villa } from '@/types';
import { DollarSign, Save, ChevronLeft, ChevronRight, TrendingUp, Info, AlertCircle, Loader2, Calendar as CalendarIcon } from 'lucide-react';

const PricingPage = () => {
  const [villas, setVillas] = useState<Villa[]>([]);
  const [selectedVillaId, setSelectedVillaId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [monthlyPrices, setMonthlyPrices] = useState<any[]>([]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  useEffect(() => {
    fetchVillas();
  }, []);

  const fetchVillas = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('villas')
        .select('*')
        .neq('status', 'inactive');

      if (error) throw error;
      if (data && data.length > 0) {
        setVillas(data);
        setSelectedVillaId(data[0].id);
        setMonthlyPrices(data[0].monthly_prices || []);
      }
    } catch (error) {
      console.error(error);
    } finally {
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

  const handlePriceChange = (month: number, type: 'weekday' | 'weekend', value: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    const val = input.value;
    
    // Thuật toán bảo toàn chữ số
    const cursorPosition = input.selectionStart || 0;
    const digitsBeforeCursor = val.substring(0, cursorPosition).replace(/\D/g, '').length;

    const rawValue = val.replace(/\D/g, '');
    const amount = rawValue === '' ? 0 : Number(rawValue);
    
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

    // Khôi phục con trỏ
    setTimeout(() => {
      const formatted = amount === 0 ? "" : amount.toLocaleString('vi-VN');
      let newPos = 0;
      let digitsFound = 0;
      for (let i = 0; i < formatted.length && digitsFound < digitsBeforeCursor; i++) {
        if (/\d/.test(formatted[i])) digitsFound++;
        newPos = i + 1;
      }
      input.setSelectionRange(newPos, newPos);
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
      alert(`Đã cập nhật thành công bảng giá năm ${selectedYear}!`);
    } catch (error) {
      console.error(error);
      alert('Lỗi khi lưu bảng giá!');
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
    <div className="space-y-8 animate-in fade-in duration-700 pb-20">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-6">
           <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Cấu hình giá chi tiết</h1>
            <p className="text-slate-500 font-medium italic">Quản lý giá theo năm và loại ngày (Thường/Cuối tuần).</p>
          </div>
          
          <div className="flex items-center bg-white border border-slate-200 rounded-2xl p-1 shadow-sm">
            <button onClick={() => setSelectedYear(selectedYear - 1)} className="p-2 hover:bg-slate-50 text-slate-400 hover:text-slate-900 transition-all rounded-xl"><ChevronLeft size={20} /></button>
            <div className="px-6 py-2 flex flex-col items-center">
              <span className="text-[10px] font-black text-orange-500 uppercase tracking-widest leading-none mb-1">Năm</span>
              <span className="text-xl font-black text-slate-900 leading-none">{selectedYear}</span>
            </div>
            <button onClick={() => setSelectedYear(selectedYear + 1)} className="p-2 hover:bg-slate-50 text-slate-400 hover:text-slate-900 transition-all rounded-xl"><ChevronRight size={20} /></button>
          </div>
        </div>

        <button 
          onClick={handleSave}
          disabled={saving || !selectedVillaId}
          className="bg-slate-900 text-white hover:bg-orange-600 px-10 py-4 rounded-2xl font-black shadow-xl shadow-slate-200 flex items-center gap-3 transition-all active:scale-95 disabled:opacity-50"
        >
          {saving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
          Lưu bảng giá {selectedYear}
        </button>
      </header>

      {/* Villa Tabs */}
      <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar">
        {villas.map((villa) => (
          <button
            key={villa.id}
            onClick={() => setSelectedVillaId(villa.id)}
            className={`flex-shrink-0 px-8 py-4 rounded-2xl font-black transition-all border-2 ${
              selectedVillaId === villa.id 
                ? 'border-orange-500 bg-orange-50 text-orange-600 shadow-lg shadow-orange-100' 
                : 'border-slate-100 bg-white text-slate-400 hover:border-slate-300'
            }`}
          >
            {villa.name}
          </button>
        ))}
      </div>

      {selectedVilla && (
        <div className="bg-white border border-slate-200 rounded-[3rem] p-10 shadow-sm overflow-hidden w-full">
          <table className="w-full text-left">
            <thead>
              <tr className="text-slate-400 text-[10px] border-b border-slate-100 uppercase tracking-widest font-black">
                <th className="pb-6 pl-4">Tháng</th>
                <th className="pb-6">Phân loại</th>
                <th className="pb-6 text-center">Giá Ngày Thường (T2-T6, CN)</th>
                <th className="pb-6 text-center">Giá Cuối Tuần (Thứ 7)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {months.map((month) => {
                const seasonal = getPriceForMonth(month);
                const isPeak = [6, 7, 8].includes(month);
                const isPast = selectedYear === new Date().getFullYear() && month < new Date().getMonth() + 1;
                
                // Hiển thị rỗng nếu giá trị bằng 0 để dễ nhập
                const displayWeekday = seasonal?.weekday_price === 0 ? '' : (seasonal?.weekday_price || 5000000).toLocaleString('vi-VN');
                const displayWeekend = seasonal?.weekend_price === 0 ? '' : (seasonal?.weekend_price || 7000000).toLocaleString('vi-VN');

                return (
                  <tr key={month} className={`group ${isPast ? 'opacity-40' : ''} hover:bg-slate-50 transition-colors`}>
                    <td className="py-6 pl-4">
                      <span className="font-black text-slate-900 text-lg">Tháng {month}</span>
                      <p className="text-[10px] text-slate-400 font-bold tracking-widest">{selectedYear}</p>
                    </td>
                    <td className="py-6">
                      {isPeak ? (
                        <span className="bg-red-50 text-red-600 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border border-red-100 italic">Cao điểm</span>
                      ) : (
                        <span className="bg-slate-50 text-slate-400 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border border-slate-100">Thường</span>
                      )}
                    </td>
                    <td className="py-6 px-4">
                      <div className="flex items-center justify-center gap-3 bg-white border border-slate-100 rounded-2xl p-1 focus-within:ring-2 focus-within:ring-orange-500 transition-all">
                        <span className="pl-3 text-slate-300 font-black text-xs">VNĐ</span>
                        <input 
                          type="text" 
                          disabled={isPast}
                          className="bg-transparent border-none p-3 text-right font-black text-slate-900 w-full outline-none"
                          value={displayWeekday}
                          onChange={(e) => handlePriceChange(month, 'weekday', e.target.value, e)}
                        />
                      </div>
                    </td>
                    <td className="py-6 px-4">
                      <div className="flex items-center justify-center gap-3 bg-indigo-50/50 border border-indigo-100 rounded-2xl p-1 focus-within:ring-2 focus-within:ring-indigo-500 transition-all">
                        <span className="pl-3 text-indigo-300 font-black text-xs">VNĐ</span>
                        <input 
                          type="text" 
                          disabled={isPast}
                          className="bg-transparent border-none p-3 text-right font-black text-indigo-600 w-full outline-none"
                          value={displayWeekend}
                          onChange={(e) => handlePriceChange(month, 'weekend', e.target.value, e)}
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
