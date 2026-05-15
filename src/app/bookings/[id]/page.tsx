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
    <div className="max-w-[1200px] mx-auto space-y-10 animate-in fade-in duration-700 pb-32 px-4 mt-10">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          <button onClick={() => router.back()} className="p-3 bg-white border border-slate-200 rounded-2xl text-slate-500 hover:text-slate-900 transition-all"><ArrowLeft size={24} /></button>
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tighter">Chi tiết Phiếu đặt</h1>
            <p className="text-slate-500 font-bold text-[10px] uppercase tracking-widest mt-1">Mã đơn: #{booking.id.slice(0, 8).toUpperCase()}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={copyConfirmation} className={`flex items-center gap-2 px-6 py-4 rounded-2xl font-black transition-all border ${copied ? 'bg-emerald-500 text-white' : 'bg-white text-indigo-600 border-indigo-100'}`}>
            {copied ? <Check size={20} /> : <Copy size={20} />} {copied ? 'Đã sao chép!' : 'Sao chép mẫu'}
          </button>
          {!isEditing ? (
            <button onClick={() => setIsEditing(true)} className="flex items-center gap-2 bg-slate-100 text-slate-900 px-6 py-4 rounded-2xl font-black hover:bg-slate-200 transition-all"><Edit3 size={20} /> Sửa phiếu</button>
          ) : (
            <div className="flex items-center gap-2">
              <button onClick={() => setIsEditing(false)} className="p-4 bg-white border border-slate-200 text-slate-400 rounded-2xl hover:text-slate-900"><X size={24} /></button>
              <button onClick={handleUpdate} disabled={updating || !!conflictError} className="flex items-center gap-2 bg-emerald-600 text-white px-8 py-4 rounded-2xl font-black shadow-xl disabled:opacity-50"><Save size={20} /> Lưu</button>
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

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-8 space-y-10">
          <div className="bg-white border border-slate-200 rounded-[3rem] p-12 shadow-sm space-y-12">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Trạng thái hiện tại</p>
                <div className={`flex items-center gap-3 ${currentStatus.text}`}>
                  <currentStatus.icon size={28} />
                  <span className="text-3xl font-black tracking-tighter">{currentStatus.label}</span>
                </div>
              </div>
              {!isEditing && (
                <div className="flex p-2 rounded-2xl gap-3">
                  {booking.status === 'deposited' && (
                    <div className="relative group">
                      <button
                        onClick={() => updateStatus('checked_in')}
                        disabled={updating || isCheckInDisabled}
                        className={`bg-indigo-600 text-white px-10 py-4 rounded-2xl font-black shadow-xl transition-all ${isCheckInDisabled ? 'opacity-30 grayscale cursor-not-allowed' : 'hover:bg-indigo-700'}`}
                      >
                        {isCheckInDisabled ? 'Chưa đến ngày Check-in' : 'Check-in ngay'}
                      </button>
                      {isCheckInDisabled && (
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-4 w-48 p-3 bg-slate-900 text-white text-[10px] font-bold rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none text-center">
                          Lưu ý: Bạn không thể Check-in trước ngày hẹn. Hãy dùng nút "Sửa phiếu" nếu khách đến sớm!
                        </div>
                      )}
                    </div>
                  )}
                  {booking.status === 'checked_in' && (
                    <button onClick={() => updateStatus('completed')} disabled={updating} className="bg-blue-600 text-white px-10 py-4 rounded-2xl font-black shadow-xl hover:bg-blue-700">Check-out & Hoàn thành</button>
                  )}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-16 py-12 border-y border-slate-50">
              <div className="space-y-8">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl"><User size={24} /></div>
                  <div className="flex-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Khách hàng</p>
                    {isEditing ? (
                      <div className="space-y-2">
                        <input type="text" className="w-full bg-slate-50 p-2 rounded-lg font-bold border border-slate-100" value={editForm.customer_name} onChange={e => setEditForm({ ...editForm, customer_name: e.target.value })} />
                        <input type="text" className="w-full bg-slate-50 p-2 rounded-lg font-bold border border-slate-100" value={editForm.customer_phone} onChange={e => setEditForm({ ...editForm, customer_phone: e.target.value })} />
                      </div>
                    ) : (
                      <>
                        <p className="text-xl font-black text-slate-900">{booking.customer_name}</p>
                        <div className="flex items-center gap-2 text-slate-500 font-bold mt-1"><Phone size={14} /> {booking.customer_phone}</div>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl"><MapPin size={24} /></div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Villa lưu trú</p>
                    <p className="text-xl font-black text-slate-900">{villa?.name}</p>
                    <p className="text-slate-500 font-bold text-sm mt-1">{villa?.address}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-8">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-orange-50 text-orange-600 rounded-2xl"><Calendar size={24} /></div>
                  <div className="flex-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Thời gian nghỉ</p>
                    {isEditing ? (
                      <div className="grid grid-cols-2 gap-2">
                        <input type="date" className="bg-slate-50 p-2 rounded-lg text-xs font-black outline-none border border-slate-100" value={editForm.check_in} onChange={e => setEditForm({ ...editForm, check_in: e.target.value })} />
                        <input type="date" className="bg-slate-50 p-2 rounded-lg text-xs font-black outline-none border border-slate-100" value={editForm.check_out} onChange={e => setEditForm({ ...editForm, check_out: e.target.value })} />
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 text-slate-900 font-black">
                        <span className="bg-slate-900 text-white px-3 py-1.5 rounded-xl text-xs">{booking.check_in}</span>
                        <ChevronRight size={16} className="text-slate-300" />
                        <span className="bg-slate-900 text-white px-3 py-1.5 rounded-xl text-xs">{booking.check_out}</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl"><Users size={24} /></div>
                  <div className="flex-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Sức chứa</p>
                    {isEditing ? (
                      <div className="grid grid-cols-2 gap-2">
                        <input type="number" className="bg-slate-50 p-2 rounded-lg font-black outline-none text-sm" value={editForm.adults} onChange={e => setEditForm({ ...editForm, adults: Number(e.target.value) })} />
                        <input type="number" className="bg-slate-50 p-2 rounded-lg font-black outline-none text-sm" value={editForm.children} onChange={e => setEditForm({ ...editForm, children: Number(e.target.value) })} />
                      </div>
                    ) : (
                      <p className="text-xl font-black text-slate-900">{booking.adults} Lớn, {booking.children} Trẻ em</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-slate-900">
                  <PackagePlus size={24} className="text-emerald-500" />
                  <h3 className="font-black text-xl tracking-tighter uppercase">Dịch vụ yêu cầu thêm</h3>
                </div>
                {isEditing && (
                  <button onClick={() => setEditForm({ ...editForm, additional_services: [...(editForm.additional_services || []), { name: '', price: 0 }] })} className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-4 py-2 rounded-xl">Thêm dịch vụ</button>
                )}
              </div>
              <div className="grid grid-cols-1 gap-3">
                {(isEditing ? editForm.additional_services : booking.additional_services)?.map((service, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-slate-50 p-6 rounded-2xl border border-slate-100">
                    {isEditing ? (
                      <div className="flex items-center gap-4 w-full">
                        <input type="text" className="flex-1 bg-white p-2 rounded-xl border border-slate-200 font-bold" value={service.name} onChange={e => { const s = [...(editForm.additional_services || [])]; s[idx].name = e.target.value; setEditForm({ ...editForm, additional_services: s }) }} />
                        <input type="text" className="w-32 bg-white p-2 rounded-xl border border-slate-200 font-black text-right" value={formatMoney(service.price)} onChange={e => updateService(idx, 'price', e.target.value, e)} />
                        <button onClick={() => { const s = [...(editForm.additional_services || [])]; s.splice(idx, 1); setEditForm({ ...editForm, additional_services: s }) }} className="text-slate-300 hover:text-red-500"><Trash2 size={20} /></button>
                      </div>
                    ) : (
                      <>
                        <span className="font-bold text-slate-700">{service.name}</span>
                        <span className="font-black text-emerald-600">{service.price.toLocaleString()}đ</span>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 space-y-8">
          <div className="bg-white border border-slate-200 rounded-[3rem] p-10 shadow-sm space-y-10">
            <h2 className="text-xl font-black text-slate-900 flex items-center gap-3"><CreditCard className="text-emerald-500" size={24} /> Thanh toán</h2>
            <div className="space-y-6">
              <div className="flex justify-between items-center text-slate-500 font-bold">
                <span className="text-sm">Tổng cộng</span>
                {isEditing ? (
                  <input ref={totalAmountRef} type="text" className="w-32 bg-slate-50 p-2 rounded-lg text-right font-black" value={formatMoney(editForm.total_amount || 0)} onChange={e => handleMoneyChange('total_amount', e)} />
                ) : (
                  <span className="text-xl font-black text-slate-900">{booking.total_amount.toLocaleString()}đ</span>
                )}
              </div>
              <div className="flex justify-between items-center text-emerald-600 font-black">
                <span className="text-sm uppercase tracking-widest">Đã đặt cọc</span>
                {isEditing ? (
                  <input ref={depositAmountRef} type="text" className="w-32 bg-emerald-50 p-2 rounded-lg text-right font-black" value={formatMoney(editForm.deposit_amount || 0)} onChange={e => handleMoneyChange('deposit_amount', e)} />
                ) : (
                  <span className="text-xl">{booking.deposit_amount.toLocaleString()}đ</span>
                )}
              </div>
              <div className="pt-6 border-t border-slate-100 flex justify-between items-center">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Còn lại cần thu</span>
                <span className="text-2xl font-black text-orange-600">{(Number(isEditing ? editForm.total_amount : booking.total_amount) - Number(isEditing ? editForm.deposit_amount : booking.deposit_amount)).toLocaleString()}đ</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookingDetailPage;
