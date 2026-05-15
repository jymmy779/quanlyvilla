'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Booking, Villa, AdditionalService, MonthlyPrice } from '@/types';
import {
  ArrowLeft, Calendar, User, Phone, MapPin, DollarSign,
  CheckCircle2, Clock, Ban, ChevronRight, MessageSquare,
  Users, CreditCard, ShieldCheck, Printer, Trash2, Loader2, PackagePlus,
  Edit3, Save, X, Copy, Check, PlusCircle, RefreshCw, AlertTriangle, Info
} from 'lucide-react';

const BookingDetailPage = () => {
  const { id } = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState<Booking | null>(null);
  const [villa, setVilla] = useState<Villa | null>(null);
  const [updating, setUpdating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isManualDeposit, setIsManualDeposit] = useState(false);
  const [conflictError, setConflictError] = useState<string | null>(null);

  const [editForm, setEditForm] = useState<Partial<Booking>>({});

  const totalAmountRef = useRef<HTMLInputElement>(null);
  const depositAmountRef = useRef<HTMLInputElement>(null);

  const todayStr = new Date().toISOString().split('T')[0];

  useEffect(() => {
    fetchBookingDetail();
  }, [id]);

  const fetchBookingDetail = async () => {
    try {
      setLoading(true);
      const { data: bookingData, error: bError } = await supabase
        .from('bookings')
        .select('*')
        .eq('id', id)
        .single();

      if (bError) throw bError;
      setBooking(bookingData);
      setEditForm(bookingData);

      if (bookingData) {
        const { data: villaData } = await supabase
          .from('villas')
          .select('*')
          .eq('id', bookingData.villa_id)
          .single();
        setVilla(villaData);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Không tìm thấy thông tin đơn đặt!');
      router.push('/bookings');
    } finally {
      setLoading(false);
    }
  };

  const checkAvailability = async (checkIn: string, checkOut: string) => {
    if (!villa || !checkIn || !checkOut) return;
    try {
      const { data } = await supabase
        .from('bookings')
        .select('id, customer_name')
        .eq('villa_id', villa.id)
        .neq('id', id)
        .neq('status', 'cancelled')
        .lt('check_in', checkOut)
        .gt('check_out', checkIn);

      if (data && data.length > 0) {
        setConflictError(`Trùng lịch với khách: ${data[0].customer_name}`);
      } else {
        setConflictError(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRecalculate = useCallback(() => {
    if (!villa || !editForm.check_in || !editForm.check_out) return;
    const start = new Date(editForm.check_in);
    const end = new Date(editForm.check_out);
    if (end <= start) return;
    let total = 0;
    const current = new Date(start);
    while (current < end) {
      const month = current.getMonth() + 1;
      const year = current.getFullYear();
      const dayOfWeek = current.getDay();
      const priceConfig = villa.monthly_prices?.find((p: MonthlyPrice) => p.month === month && p.year === year);
      if (priceConfig) {
        total += dayOfWeek === 6 ? priceConfig.weekend_price : priceConfig.weekday_price;
      } else {
        total += villa.price || 5000000;
      }
      current.setDate(current.getDate() + 1);
    }
    const servicesTotal = (editForm.additional_services || []).reduce((sum, s) => sum + s.price, 0);
    const grandTotal = total + servicesTotal;
    setEditForm(prev => ({ ...prev, total_amount: grandTotal, deposit_amount: isManualDeposit ? prev.deposit_amount : grandTotal / 2 }));
  }, [villa, editForm.check_in, editForm.check_out, editForm.additional_services, isManualDeposit]);

  useEffect(() => {
    if (isEditing) {
      handleRecalculate();
      checkAvailability(editForm.check_in || '', editForm.check_out || '');
    }
  }, [editForm.check_in, editForm.check_out, isEditing, handleRecalculate]);

  const handleUpdate = async () => {
    if (!booking || conflictError) return;
    try {
      setUpdating(true);
      const { error } = await supabase.from('bookings').update({ ...editForm }).eq('id', id);
      if (error) throw error;
      setBooking({ ...booking, ...editForm } as Booking);
      setIsEditing(false);
      alert('Đã cập nhật thông tin thành công!');
    } catch (error) {
      console.error(error);
      alert('Lỗi khi cập nhật!');
    } finally {
      setUpdating(false);
    }
  };

  const updateStatus = async (newStatus: string) => {
    if (!booking) return;
    try {
      setUpdating(true);
      const { error } = await supabase.from('bookings').update({ status: newStatus }).eq('id', id);
      if (error) throw error;
      setBooking({ ...booking, status: newStatus as any });
      alert('Cập nhật trạng thái thành công!');
    } catch (error) {
      console.error(error);
      alert('Lỗi khi cập nhật trạng thái!');
    } finally {
      setUpdating(false);
    }
  };

  const copyConfirmation = () => {
    if (!booking || !villa) return;
    const text = `✍️ XÁC NHẬN TIỀN CỌC VILLA\nĐịa chỉ: ${villa.address}... (nội dung cũ)`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatMoney = (amount: number) => {
    if (amount === 0) return '';
    return amount.toLocaleString('vi-VN');
  };

  const handleMoneyChange = (field: 'total_amount' | 'deposit_amount', e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    const value = input.value;
    
    // Đếm số chữ số trước con trỏ
    const cursorPosition = input.selectionStart || 0;
    const digitsBeforeCursor = value.substring(0, cursorPosition).replace(/\D/g, '').length;

    const rawValue = value.replace(/\D/g, '');
    const numValue = rawValue === '' ? 0 : Number(rawValue);

    if (field === 'total_amount') {
      setEditForm(prev => ({ ...prev, total_amount: numValue, deposit_amount: isManualDeposit ? prev.deposit_amount : Math.floor(numValue / 2) }));
    } else {
      setEditForm(prev => ({ ...prev, deposit_amount: numValue }));
      setIsManualDeposit(true);
    }

    setTimeout(() => {
      const formatted = numValue === 0 ? "" : numValue.toLocaleString('vi-VN');
      let newPos = 0;
      let digitsFound = 0;
      for (let i = 0; i < formatted.length && digitsFound < digitsBeforeCursor; i++) {
        if (/\d/.test(formatted[i])) digitsFound++;
        newPos = i + 1;
      }
      
      const targetInput = field === 'total_amount' ? totalAmountRef : depositAmountRef;
      if (targetInput.current) {
        targetInput.current.setSelectionRange(newPos, newPos);
      }
    }, 0);
  };

  const updateService = (index: number, field: keyof AdditionalService, value: string, e?: React.ChangeEvent<HTMLInputElement>) => {
    const newServices = [...(editForm.additional_services || [])];
    if (field === 'price' && e) {
      const input = e.target;
      const val = input.value;
      const cursorPosition = input.selectionStart || 0;
      const digitsBeforeCursor = val.substring(0, cursorPosition).replace(/\D/g, '').length;

      const numValue = Number(val.replace(/\D/g, '')) || 0;
      newServices[index].price = numValue;

      setTimeout(() => {
        const formatted = numValue === 0 ? "" : numValue.toLocaleString('vi-VN');
        let newPos = 0;
        let digitsFound = 0;
        for (let i = 0; i < formatted.length && digitsFound < digitsBeforeCursor; i++) {
          if (/\d/.test(formatted[i])) digitsFound++;
          newPos = i + 1;
        }
        input.setSelectionRange(newPos, newPos);
      }, 0);
    } else {
      newServices[index].name = value;
    }
    setEditForm({ ...editForm, additional_services: newServices });
  };

  if (loading) return <div className="min-h-[80vh] flex items-center justify-center"><Loader2 className="text-orange-500 animate-spin" size={48} /></div>;
  if (!booking) return null;

  const statusMap = {
    'deposited': { label: 'Đã đặt cọc', color: 'bg-emerald-500', icon: ShieldCheck, text: 'text-emerald-600', bg: 'bg-emerald-50' },
    'checked_in': { label: 'Đang lưu trú', color: 'bg-indigo-600', icon: Clock, text: 'text-indigo-600', bg: 'bg-indigo-50' },
    'completed': { label: 'Đã hoàn thành', color: 'bg-blue-600', icon: CheckCircle2, text: 'text-blue-600', bg: 'bg-blue-50' }
  };

  const currentStatus = statusMap[booking.status as keyof typeof statusMap] || { label: 'Chờ xử lý', icon: Clock, text: 'text-slate-600' };

  // Logic kiểm tra ngày để khóa nút Check-in
  const isCheckInDisabled = booking.check_in > todayStr;

  return (
    <div className="max-w-[1100px] mx-auto space-y-6 md:space-y-8 animate-in fade-in duration-700 pb-16 md:pb-24 px-4 mt-6 md:mt-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/80 backdrop-blur-md sticky top-0 z-20 py-4 -mx-4 px-4 border-b border-slate-100 mb-6">
        <div className="flex items-center gap-3 md:gap-4">
          <button onClick={() => router.back()} className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-500 hover:text-slate-900 transition-all shadow-sm">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">Chi tiết Phiếu đặt</h1>
            <p className="text-slate-500 font-bold text-[9px] md:text-[10px] uppercase tracking-widest mt-0.5">Mã đơn: #{booking.id.slice(0, 8).toUpperCase()}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={copyConfirmation} className={`flex items-center gap-2 px-4 py-2 rounded-xl font-black text-xs transition-all border ${copied ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-white text-indigo-600 border-indigo-100 hover:bg-indigo-50'}`}>
            {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? 'Đã chép!' : 'Mẫu xác nhận'}
          </button>
          {!isEditing ? (
            <button onClick={() => setIsEditing(true)} className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-xl font-black text-xs hover:bg-orange-600 transition-all shadow-md">
              <Edit3 size={14} /> Sửa
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button onClick={() => setIsEditing(false)} className="p-2 bg-white border border-slate-200 text-slate-400 rounded-xl hover:text-slate-900"><X size={18} /></button>
              <button onClick={handleUpdate} disabled={updating || !!conflictError} className="flex items-center gap-2 bg-emerald-600 text-white px-5 py-2 rounded-xl font-black text-xs shadow-lg disabled:opacity-50"><Save size={14} /> Lưu</button>
            </div>
          )}
        </div>
      </header>

      {isEditing && isCheckInDisabled && (
        <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-center gap-3 text-indigo-600 mb-4 animate-pulse">
          <Info size={20} />
          <p className="text-sm font-bold italic">* Lưu ý: Để "Check-in sớm", bạn cần sửa ngày nhận phòng thành hôm nay ({todayStr}) rồi nhấn Lưu.</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">
        <div className="lg:col-span-8 space-y-6 md:space-y-8">
          <div className="bg-white border border-slate-200 rounded-2xl md:rounded-3xl p-6 md:p-8 shadow-sm space-y-6 md:space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-0.5">
                <p className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest">Trạng thái</p>
                <div className={`flex items-center gap-2 md:gap-3 ${currentStatus.text}`}>
                  <currentStatus.icon size={20} className="md:w-6 md:h-6" />
                  <span className="text-lg md:text-xl font-black tracking-tight">{currentStatus.label}</span>
                </div>
              </div>
              {!isEditing && (
                <div className="flex gap-2">
                  {booking.status === 'deposited' && (
                    <div className="relative group flex-1 md:flex-none">
                      <button
                        onClick={() => updateStatus('checked_in')}
                        disabled={updating || isCheckInDisabled}
                        className={`w-full md:w-auto bg-indigo-600 text-white px-5 md:px-6 py-2 md:py-2.5 rounded-xl font-black text-[10px] md:text-xs uppercase tracking-widest shadow-md transition-all ${isCheckInDisabled ? 'opacity-30 grayscale cursor-not-allowed' : 'hover:bg-indigo-700 active:scale-95'}`}
                      >
                        {isCheckInDisabled ? 'Chưa tới ngày' : 'Check-in ngay'}
                      </button>
                    </div>
                  )}
                  {booking.status === 'checked_in' && (
                    <button onClick={() => updateStatus('completed')} disabled={updating} className="flex-1 md:flex-none bg-blue-600 text-white px-5 md:px-6 py-2 md:py-2.5 rounded-xl font-black text-[10px] md:text-xs uppercase tracking-widest shadow-md hover:bg-blue-700 active:scale-95">Check-out</button>
                  )}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 py-6 md:py-8 border-y border-slate-50">
              <div className="space-y-6 md:space-y-8">
                <div className="flex items-start gap-3 md:gap-4">
                  <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl md:rounded-2xl flex-shrink-0"><User size={20} /></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Khách hàng</p>
                    {isEditing ? (
                      <div className="space-y-2">
                        <input type="text" className="w-full bg-slate-50 p-2.5 rounded-xl font-bold border border-slate-100 text-sm" value={editForm.customer_name} onChange={e => setEditForm({ ...editForm, customer_name: e.target.value })} />
                        <input type="text" className="w-full bg-slate-50 p-2.5 rounded-xl font-bold border border-slate-100 text-sm" value={editForm.customer_phone} onChange={e => setEditForm({ ...editForm, customer_phone: e.target.value })} />
                      </div>
                    ) : (
                      <>
                        <p className="text-base md:text-lg font-black text-slate-900 truncate">{booking.customer_name}</p>
                        <div className="flex items-center gap-1.5 text-slate-500 font-bold mt-0.5 text-xs md:text-sm"><Phone size={12} /> {booking.customer_phone}</div>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-start gap-3 md:gap-4">
                  <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl md:rounded-2xl flex-shrink-0"><MapPin size={20} /></div>
                  <div className="min-w-0">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Villa lưu trú</p>
                    <p className="text-base md:text-lg font-black text-slate-900 truncate">{villa?.name}</p>
                    <p className="text-slate-500 font-bold text-xs mt-0.5 truncate">{villa?.address}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-6 md:space-y-8">
                <div className="flex items-start gap-3 md:gap-4">
                  <div className="p-2.5 bg-orange-50 text-orange-600 rounded-xl md:rounded-2xl flex-shrink-0"><Calendar size={20} /></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Thời gian nghỉ</p>
                    {isEditing ? (
                      <div className="grid grid-cols-2 gap-2">
                        <input type="date" className="bg-slate-50 p-2 rounded-lg text-[10px] font-black outline-none border border-slate-100" value={editForm.check_in} onChange={e => setEditForm({ ...editForm, check_in: e.target.value })} />
                        <input type="date" className="bg-slate-50 p-2 rounded-lg text-[10px] font-black outline-none border border-slate-100" value={editForm.check_out} onChange={e => setEditForm({ ...editForm, check_out: e.target.value })} />
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-slate-900 font-black mt-1">
                        <span className="bg-slate-900 text-white px-2 py-1 rounded-lg text-[10px]">{booking.check_in}</span>
                        <ChevronRight size={14} className="text-slate-300" />
                        <span className="bg-slate-900 text-white px-2 py-1 rounded-lg text-[10px]">{booking.check_out}</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-start gap-3 md:gap-4">
                  <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl md:rounded-2xl flex-shrink-0"><Users size={20} /></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Sức chứa</p>
                    {isEditing ? (
                      <div className="grid grid-cols-2 gap-2">
                        <input type="number" className="bg-slate-50 p-2 rounded-lg font-black outline-none text-xs" value={editForm.adults} onChange={e => setEditForm({ ...editForm, adults: Number(e.target.value) })} />
                        <input type="number" className="bg-slate-50 p-2 rounded-lg font-black outline-none text-xs" value={editForm.children} onChange={e => setEditForm({ ...editForm, children: Number(e.target.value) })} />
                      </div>
                    ) : (
                      <p className="text-base md:text-lg font-black text-slate-900 truncate">{booking.adults} Lớn, {booking.children} Trẻ em</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-5 md:space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 md:gap-3 text-slate-900">
                  <PackagePlus size={20} className="text-emerald-500 md:w-6 md:h-6" />
                  <h3 className="font-black text-lg md:text-xl tracking-tighter uppercase">Dịch vụ thêm</h3>
                </div>
                {isEditing && (
                  <button onClick={() => setEditForm({ ...editForm, additional_services: [...(editForm.additional_services || []), { name: '', price: 0 }] })} className="text-[9px] md:text-[10px] font-black text-emerald-600 bg-emerald-50 px-3 md:px-4 py-1.5 md:py-2 rounded-lg md:rounded-xl">Thêm mới</button>
                )}
              </div>
              <div className="grid grid-cols-1 gap-2.5 md:gap-3">
                {(isEditing ? editForm.additional_services : booking.additional_services)?.map((service, idx) => (
                  <div key={idx} className="bg-slate-50 p-3 md:p-4 rounded-xl md:rounded-2xl border border-slate-100">
                    {isEditing ? (
                      <div className="flex flex-col md:flex-row md:items-center gap-3">
                        <input type="text" placeholder="Tên dịch vụ..." className="flex-1 bg-white p-2.5 rounded-xl border border-slate-200 font-bold text-xs md:text-sm" value={service.name} onChange={e => { const s = [...(editForm.additional_services || [])]; s[idx].name = e.target.value; setEditForm({ ...editForm, additional_services: s }) }} />
                        <div className="flex items-center gap-2">
                          <input type="text" placeholder="Giá tiền..." className="flex-1 md:w-32 bg-white p-2.5 rounded-xl border border-slate-200 font-black text-right text-xs md:text-sm text-emerald-600" value={formatMoney(service.price)} onChange={e => updateService(idx, 'price', e.target.value, e)} />
                          <button onClick={() => { const s = [...(editForm.additional_services || [])]; s.splice(idx, 1); setEditForm({ ...editForm, additional_services: s }) }} className="p-2.5 text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={18} /></button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-700 text-xs md:text-sm">{service.name}</span>
                        <span className="font-black text-emerald-600 text-xs md:text-sm">{service.price.toLocaleString()}đ</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 space-y-6 md:space-y-8">
          <div className="bg-white border border-slate-200 rounded-2xl md:rounded-3xl p-6 md:p-8 shadow-sm space-y-6">
            <h2 className="text-base md:text-lg font-black text-slate-900 flex items-center gap-2.5">
              <div className="w-1.5 h-6 bg-emerald-500 rounded-full"></div>
              Thanh toán
            </h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center text-slate-500 font-bold">
                <span className="text-[10px] uppercase tracking-widest">Tổng cộng</span>
                {isEditing ? (
                  <input ref={totalAmountRef} type="text" className="w-24 md:w-32 bg-slate-50 p-2 rounded-xl text-right font-black text-xs md:text-sm" value={formatMoney(editForm.total_amount || 0)} onChange={e => handleMoneyChange('total_amount', e)} />
                ) : (
                  <span className="text-sm md:text-base font-black text-slate-900">{booking.total_amount.toLocaleString()}đ</span>
                )}
              </div>
              <div className="flex justify-between items-center text-emerald-600 font-black">
                <span className="text-[10px] uppercase tracking-widest">Đã cọc</span>
                {isEditing ? (
                  <input ref={depositAmountRef} type="text" className="w-24 md:w-32 bg-emerald-50 p-2 rounded-xl text-right font-black text-xs md:text-sm" value={formatMoney(editForm.deposit_amount || 0)} onChange={e => handleMoneyChange('deposit_amount', e)} />
                ) : (
                  <span className="text-sm md:text-base">{booking.deposit_amount.toLocaleString()}đ</span>
                )}
              </div>
              <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Cần thu thêm</span>
                <span className="text-lg md:text-xl font-black text-orange-600">{(Number(isEditing ? editForm.total_amount : booking.total_amount) - Number(isEditing ? editForm.deposit_amount : booking.deposit_amount)).toLocaleString()}đ</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookingDetailPage;
