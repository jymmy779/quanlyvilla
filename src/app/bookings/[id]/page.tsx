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
import { useNotification } from '@/context/NotificationContext';

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
  const [isManualTotal, setIsManualTotal] = useState(false);
  const [conflictError, setConflictError] = useState<string | null>(null);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [templateText, setTemplateText] = useState('');
  const [rawTemplate, setRawTemplate] = useState('');

  const [editForm, setEditForm] = useState<Partial<Booking>>({});

  const totalAmountRef = useRef<HTMLInputElement>(null);
  const depositAmountRef = useRef<HTMLInputElement>(null);

  const todayStr = new Date().toISOString().split('T')[0];
  const { showToast, confirm: showConfirm } = useNotification();

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
      showToast('Không tìm thấy thông tin đơn đặt!', 'error');
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
    if (isManualTotal) return;
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
        let price = priceConfig.weekday_price;
        if (dayOfWeek === 6) {
          price = priceConfig.weekend_price;
        } else if (dayOfWeek === 5) {
          price = priceConfig.friday_price ?? priceConfig.weekday_price;
        } else if (dayOfWeek === 0) {
          price = priceConfig.sunday_price ?? priceConfig.weekday_price;
        }
        total += price;
      } else {
        total += villa.price || 5000000;
      }
      current.setDate(current.getDate() + 1);
    }
    const servicesTotal = (editForm.additional_services || []).reduce((sum, s) => sum + s.price, 0);
    const grandTotal = total + servicesTotal;
    setEditForm(prev => ({ ...prev, total_amount: grandTotal, deposit_amount: isManualDeposit ? prev.deposit_amount : grandTotal / 2 }));
  }, [villa, editForm.check_in, editForm.check_out, editForm.additional_services, isManualDeposit, isManualTotal]);

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
      showToast('Đã cập nhật thông tin thành công!');
    } catch (error) {
      console.error(error);
      showToast('Lỗi khi cập nhật!', 'error');
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
      showToast('Cập nhật trạng thái thành công!');
    } catch (error) {
      console.error(error);
      showToast('Lỗi khi cập nhật trạng thái!', 'error');
    } finally {
      setUpdating(false);
    }
  };

  const fetchTemplate = async () => {
    try {
      const { data } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'booking_confirmation_template')
        .single();
      
      return data?.value || null;
    } catch (err) {
      return null;
    }
  };

  const generateConfirmationText = (template: string) => {
    if (!booking || !villa) return '';

    const formatDate = (dateStr: string) => {
      if (!dateStr) return '';
      const [year, month, day] = dateStr.split('-');
      return `${day}/${month}/${year}`;
    };

    const remainingAmount = booking.total_amount - booking.deposit_amount;
    const totalGuests = (booking.adults || 0) + (booking.children || 0);

    const data = {
      customer_name: booking.customer_name,
      customer_phone: booking.customer_phone,
      check_in: formatDate(booking.check_in),
      check_out: formatDate(booking.check_out),
      villa_name: villa.name,
      villa_address: villa.address,
      villa_map_link: villa.map_link || '',
      total_guests: totalGuests.toString(),
      adults: booking.adults.toString(),
      children: booking.children.toString(),
      remaining_amount: remainingAmount.toLocaleString('vi-VN') + 'đ',
    };

    let result = template;
    Object.entries(data).forEach(([key, val]) => {
      result = result.replace(new RegExp(`{{${key}}}`, 'g'), val);
    });

    return result;
  };

  const handleOpenTemplate = async () => {
    if (!booking || !villa) return;
    
    let template = rawTemplate;
    if (!template) {
      const fetched = await fetchTemplate();
      if (fetched) {
        setRawTemplate(fetched);
        template = fetched;
      } else {
        // Fallback to the original hardcoded template if DB is empty
        template = `✍️ XÁC NHẬN TIỀN CỌC VILLA
Địa chỉ: {{villa_address}}
Định vị: {{villa_map_link}}
Khách Hàng: {{customer_name}}
SĐT: {{customer_phone}}
Số lượng khách: {{total_guests}} gồm {{adults}} người lớn và {{children}} trẻ em
⏰𝐂𝐡𝐞𝐜𝐤 𝐢𝐧: sau 14h ngày {{check_in}}
⏰𝐂𝐡𝐞𝐜𝐤 𝐨𝐮𝐭: trước 12h ngày {{check_out}}
💸 𝐓𝐢𝐞̂̀𝐧 𝐜𝐨̀𝐧 𝐥𝐚̣𝐢 (𝐭𝐡𝐚𝐧𝐡 𝐭𝐨𝐚́𝐧 𝐤𝐡𝐢 𝐧𝐡𝐚̣̂𝐧 𝐩𝐡𝐨̀𝐧𝐠): {{remaining_amount}}

📞  Quản giá đón khách và hỗ trợ: 0326151111 (a Tùng)

🚫 QUY ĐỊNH LƯU TRÚ & PHỤ PHÍ
-  Quý khách vui lòng cung cấp ảnh chụp CCCD của cả đoàn để làm thủ tục khai báo tạm trú. Chúng em sẽ từ chối nhận khách nếu mục này không thể thực hiện.
-  Theo quy định mới ko được giữ căn cước công dân nên villa sẽ giữ thế chân 2 triệu đối với mỗi đoàn . Số tiền này sẽ được gửi lại vào ngày check out khi thủ tục check out không xảy ra hư hỏng gì nghiêm trọng.
-  Ở quá giờ phụ thu 300k/h nếu ngày hôm sau villa ko có khách .
-  Villa báo giá dựa trên số khách đăng ký. Phát sinh thêm người phụ thu 150.000đ/người (Vui lòng báo trước để villa chuẩn bị thêm chăn ga).
-  Quý khách vui lòng dọn dẹp, rửa bát đĩa sau khi nấu nướng. Phí hỗ trợ dọn dẹp từ 300.000-500.000đ tùy hiện trạng nếu không tự dọn.
-  Karaoke được hát tới 22h  ( quy định của toàn bộ nhà phố và villa Vũng Tàu)
-  Không bỏ đồ ăn xuống hồ bơi, phụ thu 1tr-3tr tuỳ hiện trạng.
-  Không sử dụng, tàng trữ chất cấm, cờ bạc, mại dâm theo quy định pháp luật.
-  Villa không nhận dàn loa công suất lớn và DJ

♻️ Khách hàng hủy đặt phòng sẽ không được hoàn lại tiền cọc.

Cám ơn quý khách 🌸`;
        setRawTemplate(template);
      }
    }

    setTemplateText(generateConfirmationText(template));
    setShowTemplateModal(true);
  };

  const handleCopyFinal = () => {
    navigator.clipboard.writeText(templateText);
    setCopied(true);
    setTimeout(() => {
      setCopied(false);
      setShowTemplateModal(false);
    }, 1500);
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

    let digits = value.replace(/\D/g, '');

    // Nếu người dùng xóa hết, cho phép ô trống
    if (digits === '') {
      if (field === 'total_amount') {
        setEditForm(prev => ({ ...prev, total_amount: 0, deposit_amount: isManualDeposit ? prev.deposit_amount : 0 }));
        setIsManualTotal(true);
      } else {
        setEditForm(prev => ({ ...prev, deposit_amount: 0 }));
        setIsManualDeposit(true);
      }
      const targetInput = field === 'total_amount' ? totalAmountRef : depositAmountRef;
      if (targetInput.current) targetInput.current.value = '';
      return;
    }

    // Nếu toàn số 0 (xóa số đầu tiên), giữ định dạng không ép về 0
    let formatted: string;
    if (/^0+$/.test(digits) && digits.length > 1) {
      formatted = digits.split('').map((char, index) => {
        const revIndex = digits.length - 1 - index;
        return (revIndex > 0 && revIndex % 3 === 0) ? char + '.' : char;
      }).join('');
    } else {
      digits = digits.replace(/^0+/, '') || '0';
      formatted = Number(digits).toLocaleString('vi-VN');
    }

    const numValue = Number(digits.replace(/^0+/, '')) || 0;

    if (field === 'total_amount') {
      setEditForm(prev => ({ ...prev, total_amount: numValue, deposit_amount: isManualDeposit ? prev.deposit_amount : Math.floor(numValue / 2) }));
      setIsManualTotal(true);
    } else {
      setEditForm(prev => ({ ...prev, deposit_amount: numValue }));
      setIsManualDeposit(true);
    }

    setTimeout(() => {
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

      let digits = val.replace(/\D/g, '');

      // Nếu xóa hết thì để trống
      if (digits === '') {
        newServices[index].price = 0;
        setEditForm({ ...editForm, additional_services: newServices });
        return;
      }

      // Nếu toàn số 0 (xóa chữ số đầu tiên), giữ định dạng không ép về 0
      let formatted: string;
      if (/^0+$/.test(digits) && digits.length > 1) {
        formatted = digits.split('').map((char, i) => {
          const revIndex = digits.length - 1 - i;
          return (revIndex > 0 && revIndex % 3 === 0) ? char + '.' : char;
        }).join('');
      } else {
        digits = digits.replace(/^0+/, '') || '0';
        formatted = Number(digits).toLocaleString('vi-VN');
      }

      const numValue = Number(digits.replace(/^0+/, '')) || 0;
      newServices[index].price = numValue;

      setTimeout(() => {
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
    'completed': { label: 'Đã hoàn thành', color: 'bg-blue-600', icon: CheckCircle2, text: 'text-blue-600', bg: 'bg-blue-50' },
    'cancelled': { label: 'Đã hủy đơn', color: 'bg-red-500', icon: Ban, text: 'text-red-600', bg: 'bg-red-50' }
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
            <h1 className="text-xl md:text-2xl font-semibold text-slate-900">Chi tiết Phiếu đặt</h1>
            <p className="text-slate-500 font-medium text-sm mt-0.5">Mã đơn: #{booking.id.slice(0, 8).toUpperCase()}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleOpenTemplate} className="flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm transition-all border bg-white text-indigo-600 border-indigo-100 hover:bg-indigo-50">
            <MessageSquare size={14} /> Mẫu xác nhận
          </button>
          {!isEditing ? (
            <button onClick={() => setIsEditing(true)} className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-xl font-semibold text-sm hover:bg-orange-600 transition-all shadow-md">
              <Edit3 size={14} /> Sửa
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button onClick={() => setIsEditing(false)} className="p-2 bg-white border border-slate-200 text-slate-400 rounded-xl hover:text-slate-900"><X size={18} /></button>
              <button onClick={handleUpdate} disabled={updating || !!conflictError} className="flex items-center gap-2 bg-emerald-600 text-white px-5 py-2 rounded-xl font-semibold text-sm shadow-lg disabled:opacity-50"><Save size={14} /> Lưu</button>
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
                <p className="text-sm font-medium text-slate-400">Trạng thái</p>
                <div className={`flex items-center gap-2 md:gap-3 ${currentStatus.text}`}>
                  <currentStatus.icon size={20} className="md:w-6 md:h-6" />
                  <span className="text-lg md:text-xl font-semibold">{currentStatus.label}</span>
                </div>
              </div>
              {!isEditing && (
                <div className="flex flex-wrap gap-2">
                  {booking.status === 'deposited' && (
                    <div className="relative group flex-1 md:flex-none">
                      <button
                        onClick={() => updateStatus('checked_in')}
                        disabled={updating || isCheckInDisabled}
                        className={`w-full md:w-auto bg-indigo-600 text-white px-5 md:px-6 py-2 md:py-2.5 rounded-xl font-semibold text-sm shadow-md transition-all ${isCheckInDisabled ? 'opacity-30 grayscale cursor-not-allowed' : 'hover:bg-indigo-700 active:scale-95'}`}
                      >
                        {isCheckInDisabled ? 'Chưa tới ngày' : 'Check-in ngay'}
                      </button>
                    </div>
                  )}
                  {booking.status === 'checked_in' && (
                    <button onClick={() => updateStatus('completed')} disabled={updating} className="flex-1 md:flex-none bg-blue-600 text-white px-5 md:px-6 py-2 md:py-2.5 rounded-xl font-semibold text-sm shadow-md hover:bg-blue-700 active:scale-95">Check-out</button>
                  )}
                  {booking.status !== 'completed' && booking.status !== 'cancelled' && (
                    <button
                      onClick={() => { 
                        showConfirm({
                          title: 'Hủy đơn đặt?',
                          message: 'Bạn có chắc chắn muốn HỦY đơn đặt này không? Hành động này không thể hoàn tác.',
                          onConfirm: () => updateStatus('cancelled')
                        })
                      }}
                      disabled={updating}
                      className="flex-1 md:flex-none bg-red-50 text-red-500 border border-red-100 px-5 md:px-6 py-2 md:py-2.5 rounded-xl font-semibold text-sm hover:bg-red-500 hover:text-white transition-all"
                    >
                      Hủy đơn
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 py-6 md:py-8 border-y border-slate-50">
              <div className="space-y-6 md:space-y-8">
                <div className="flex items-start gap-3 md:gap-4">
                  <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl md:rounded-2xl flex-shrink-0"><User size={20} /></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-400 mb-0.5">Khách hàng</p>
                    {isEditing ? (
                      <div className="space-y-2">
                        <input type="text" className="w-full bg-slate-50 p-2.5 rounded-xl font-medium border border-slate-100 text-sm" value={editForm.customer_name} onChange={e => setEditForm({ ...editForm, customer_name: e.target.value })} />
                        <input type="text" className="w-full bg-slate-50 p-2.5 rounded-xl font-medium border border-slate-100 text-sm" value={editForm.customer_phone} onChange={e => setEditForm({ ...editForm, customer_phone: e.target.value })} />
                      </div>
                    ) : (
                      <>
                        <p className="text-base md:text-lg font-semibold text-slate-900 truncate">{booking.customer_name}</p>
                        <div className="flex items-center gap-1.5 text-slate-500 font-medium mt-0.5 text-sm"><Phone size={12} /> {booking.customer_phone}</div>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-start gap-3 md:gap-4">
                  <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl md:rounded-2xl flex-shrink-0"><MapPin size={20} /></div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-400 mb-0.5">Villa lưu trú</p>
                    <p className="text-base md:text-lg font-semibold text-slate-900 truncate">{villa?.name}</p>
                    <p className="text-slate-500 font-medium text-sm mt-0.5 truncate">{villa?.address}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-6 md:space-y-8">
                <div className="flex items-start gap-3 md:gap-4">
                  <div className="p-2.5 bg-orange-50 text-orange-600 rounded-xl md:rounded-2xl flex-shrink-0"><Calendar size={20} /></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-400 mb-0.5">Thời gian nghỉ</p>
                    {isEditing ? (
                      <div className="grid grid-cols-2 gap-2">
                        <input type="date" className="bg-slate-50 p-2 rounded-lg text-sm font-medium outline-none border border-slate-100" value={editForm.check_in} onChange={e => setEditForm({ ...editForm, check_in: e.target.value })} />
                        <input type="date" className="bg-slate-50 p-2 rounded-lg text-sm font-medium outline-none border border-slate-100" value={editForm.check_out} onChange={e => setEditForm({ ...editForm, check_out: e.target.value })} />
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-slate-900 font-semibold mt-1">
                        <span className="bg-slate-900 text-white px-2 py-1 rounded-lg text-xs">{booking.check_in}</span>
                        <ChevronRight size={14} className="text-slate-300" />
                        <span className="bg-slate-900 text-white px-2 py-1 rounded-lg text-xs">{booking.check_out}</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-start gap-3 md:gap-4">
                  <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl md:rounded-2xl flex-shrink-0"><Users size={20} /></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-400 mb-0.5">Sức chứa</p>
                    {isEditing ? (
                      <div className="grid grid-cols-2 gap-2">
                        <input type="number" className="bg-slate-50 p-2 rounded-lg font-medium outline-none text-sm" value={editForm.adults} onChange={e => setEditForm({ ...editForm, adults: Number(e.target.value) })} />
                        <input type="number" className="bg-slate-50 p-2 rounded-lg font-medium outline-none text-sm" value={editForm.children} onChange={e => setEditForm({ ...editForm, children: Number(e.target.value) })} />
                      </div>
                    ) : (
                      <p className="text-base md:text-lg font-semibold text-slate-900 truncate">{booking.adults} Lớn, {booking.children} Trẻ em</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-5 md:space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 md:gap-3 text-slate-900">
                  <PackagePlus size={20} className="text-emerald-500 md:w-6 md:h-6" />
                  <h3 className="font-semibold text-lg md:text-xl">Dịch vụ thêm</h3>
                </div>
                {isEditing && (
                  <button onClick={() => setEditForm({ ...editForm, additional_services: [...(editForm.additional_services || []), { name: '', price: 0 }] })} className="text-sm font-semibold text-emerald-600 bg-emerald-50 px-3 md:px-4 py-1.5 md:py-2 rounded-lg md:rounded-xl">Thêm mới</button>
                )}
              </div>
              <div className="grid grid-cols-1 gap-2.5 md:gap-3">
                {(isEditing ? editForm.additional_services : booking.additional_services)?.map((service, idx) => (
                  <div key={idx} className="bg-slate-50 p-3 md:p-4 rounded-xl md:rounded-2xl border border-slate-100">
                    {isEditing ? (
                      <div className="flex flex-col md:flex-row md:items-center gap-3">
                        <input type="text" placeholder="Tên dịch vụ..." className="flex-1 bg-white p-2.5 rounded-xl border border-slate-200 font-medium text-sm" value={service.name} onChange={e => { const s = [...(editForm.additional_services || [])]; s[idx].name = e.target.value; setEditForm({ ...editForm, additional_services: s }) }} />
                        <div className="flex items-center gap-2">
                          <input type="text" placeholder="Giá tiền..." className="flex-1 md:w-32 bg-white p-2.5 rounded-xl border border-slate-200 font-semibold text-right text-sm text-emerald-600" value={formatMoney(service.price)} onChange={e => updateService(idx, 'price', e.target.value, e)} />
                          <button onClick={() => { const s = [...(editForm.additional_services || [])]; s.splice(idx, 1); setEditForm({ ...editForm, additional_services: s }) }} className="p-2.5 text-slate-300 hover:text-red-500 transition-colors cursor-pointer"><Trash2 size={18} /></button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-slate-700 text-sm">{service.name}</span>
                        <span className="font-semibold text-emerald-600 text-sm">{service.price.toLocaleString()}đ</span>
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
            <h2 className="text-base md:text-lg font-semibold text-slate-900 flex items-center gap-2.5">
              <div className="w-1.5 h-6 bg-emerald-500 rounded-full"></div>
              Thanh toán
            </h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center text-slate-500 font-medium">
                <span className="text-sm flex items-center gap-1">
                  Tổng cộng
                  {isEditing && (
                    <button 
                      type="button" 
                      onClick={() => setIsManualTotal(!isManualTotal)}
                      className={`p-1 rounded hover:bg-slate-100 transition-colors ${isManualTotal ? 'text-orange-500' : 'text-slate-400'}`}
                      title={isManualTotal ? "Đang khóa giá thủ công (Zalo Flow). Click để tự động tính lại theo hệ thống." : "Hệ thống tự động tính. Click để khóa giá."}
                    >
                      {isManualTotal ? <ShieldCheck size={14} className="text-orange-500" /> : <Clock size={14} />}
                    </button>
                  )}
                </span>
                {isEditing ? (
                  <div className="relative flex items-center">
                    <input 
                      ref={totalAmountRef} 
                      type="text" 
                      className={`w-24 md:w-32 p-2 pr-6 rounded-xl text-right font-semibold text-sm ${isManualTotal ? 'bg-orange-50 border border-orange-200 text-orange-700' : 'bg-slate-50 border border-slate-200 text-slate-900'}`} 
                      value={formatMoney(editForm.total_amount || 0)} 
                      onChange={e => handleMoneyChange('total_amount', e)} 
                    />
                    {isManualTotal && (
                      <span className="absolute right-2 text-xs" title="Đã khóa giá tự động">🔒</span>
                    )}
                  </div>
                ) : (
                  <span className="text-sm md:text-base font-semibold text-slate-900">{booking.total_amount.toLocaleString()}đ</span>
                )}
              </div>
              <div className="flex justify-between items-center text-emerald-600 font-semibold">
                <span className="text-sm">Đã cọc</span>
                {isEditing ? (
                  <input ref={depositAmountRef} type="text" className="w-24 md:w-32 bg-emerald-50 p-2 rounded-xl text-right font-semibold text-sm" value={formatMoney(editForm.deposit_amount || 0)} onChange={e => handleMoneyChange('deposit_amount', e)} />
                ) : (
                  <span className="text-sm md:text-base">{booking.deposit_amount.toLocaleString()}đ</span>
                )}
              </div>
              <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
                <span className="text-sm font-medium text-slate-400">Cần thu thêm</span>
                <span className="text-lg md:text-xl font-semibold text-orange-600">{(Number(isEditing ? editForm.total_amount : booking.total_amount) - Number(isEditing ? editForm.deposit_amount : booking.deposit_amount)).toLocaleString()}đ</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Preview & Edit Template */}
      {showTemplateModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                  <MessageSquare size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">Xác nhận nội dung</h3>
                  <p className="text-xs text-slate-500 font-medium">Bạn có thể chỉnh sửa nhanh trước khi chép</p>
                </div>
              </div>
              <button onClick={() => setShowTemplateModal(false)} className="p-2 hover:bg-white rounded-full transition-colors text-slate-400 hover:text-slate-900">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6">
              <textarea
                value={templateText}
                onChange={(e) => setTemplateText(e.target.value)}
                className="w-full h-[450px] bg-slate-50 border-none rounded-2xl p-5 text-slate-700 font-medium text-sm leading-relaxed outline-none focus:ring-2 focus:ring-indigo-100 transition-all resize-none"
              />
            </div>

            <div className="p-6 border-t border-slate-50 bg-slate-50/30 flex items-center justify-end gap-3">
              <button 
                onClick={() => setShowTemplateModal(false)}
                className="px-5 py-2.5 rounded-xl font-bold text-sm text-slate-500 hover:bg-white transition-all"
              >
                Đóng
              </button>
              <button 
                onClick={handleCopyFinal}
                disabled={copied}
                className={`flex items-center gap-2 px-8 py-2.5 rounded-xl font-bold text-sm transition-all shadow-lg active:scale-95 ${copied ? 'bg-emerald-500 text-white' : 'bg-slate-900 text-white hover:bg-indigo-600'}`}
              >
                {copied ? <Check size={18} /> : <Copy size={18} />}
                {copied ? 'Đã sao chép!' : 'Chép nội dung'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BookingDetailPage;
