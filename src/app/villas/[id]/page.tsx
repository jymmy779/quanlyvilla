'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Villa } from '@/types';
import { ArrowLeft, Users, Bed, Bath, CheckCircle2, MapPin, Edit, ImageIcon, DollarSign, Navigation, AlertCircle, Loader2, Info } from 'lucide-react';

const VillaDetailPage = () => {
  const { id } = useParams();
  const router = useRouter();
  const [villa, setVilla] = useState<Villa | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchVillaDetail();
  }, [id]);

  const fetchVillaDetail = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('villas')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setVilla(data);
    } catch (error) {
      console.error('Error fetching villa detail:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <Loader2 className="text-orange-500 animate-spin" size={48} />
      </div>
    );
  }

  if (!villa) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-slate-500 px-6 text-center">
        <AlertCircle size={40} className="text-slate-200 mb-4" />
        <p className="text-lg font-black text-slate-900">Không tìm thấy Villa</p>
        <p className="text-sm text-slate-400 font-medium">Villa có thể đã bị xóa hoặc đường dẫn sai.</p>
        <button onClick={() => router.push('/villas')} className="mt-6 bg-slate-900 text-white px-6 py-2.5 rounded-xl font-black shadow-lg">Quay lại</button>
      </div>
    );
  }

  return (
    <div className="max-w-[1200px] mx-auto space-y-4 md:space-y-6 animate-in fade-in slide-in-from-right duration-700 pb-16 px-4 mt-6 md:mt-8">
      <div className="flex items-center justify-between">
        <button 
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-slate-500 hover:text-slate-900 font-bold transition-colors p-1 text-sm"
        >
          <ArrowLeft size={18} />
          Quay lại
        </button>

        <div className="flex items-center gap-2 md:gap-4">
          <button 
            onClick={() => router.push(`/villas/edit/${id}`)}
            className="flex items-center gap-2 bg-slate-900 text-white px-4 md:px-6 py-2 md:py-2.5 rounded-xl font-black text-xs md:text-sm transition-all hover:bg-emerald-600 shadow-lg shadow-slate-100"
          >
            <Edit size={16} />
            <span className="hidden md:inline">Chỉnh sửa</span>
          </button>
        </div>
      </div>

      {/* Hero Section */}
      <div className="relative h-[280px] md:h-[450px] rounded-2xl md:rounded-3xl overflow-hidden shadow-xl bg-slate-100">
        {villa.images && villa.images.length > 0 ? (
          <img src={villa.images[0]} alt={villa.name} className={`w-full h-full object-cover ${villa.status === 'maintenance' ? 'grayscale opacity-70' : ''}`} />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-300">
            <ImageIcon size={48} />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent"></div>
        <div className="absolute bottom-6 md:bottom-10 left-6 md:left-10 text-white pr-6">
          <div className="flex items-center gap-1.5 text-orange-400 font-black uppercase tracking-widest text-[10px] md:text-xs mb-2">
            <MapPin size={14} />
            {villa.address}
          </div>
          <h1 className="text-2xl md:text-4xl font-black tracking-tighter leading-tight">{villa.name}</h1>
          
          <div className="mt-3 flex flex-wrap gap-2">
            {villa.status === 'active' ? (
              <span className="bg-emerald-500/20 backdrop-blur-md text-emerald-400 px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border border-emerald-500/30">Đang kinh doanh</span>
            ) : villa.status === 'maintenance' ? (
              <span className="bg-orange-500/20 backdrop-blur-md text-orange-400 px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border border-orange-500/30 flex items-center gap-1.5"><AlertCircle size={10} /> Đang sửa chữa</span>
            ) : (
              <span className="bg-slate-500/20 backdrop-blur-md text-slate-300 px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border border-slate-500/30">Ngừng kinh doanh</span>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-10">
        <div className="lg:col-span-2 space-y-8 md:space-y-12">
          <section className="bg-white p-6 md:p-8 rounded-2xl md:rounded-3xl border border-slate-100 shadow-sm">
            <h2 className="text-lg md:text-xl font-black text-slate-900 mb-4 flex items-center gap-2">
              <div className="w-1 h-5 bg-orange-500 rounded-full"></div>
              Giới thiệu chung
            </h2>
            <p className="text-slate-600 leading-relaxed text-sm md:text-base font-medium">
              {villa.description || 'Chưa có mô tả cho căn Villa này.'}
            </p>
          </section>

          <section>
            <h2 className="text-lg md:text-xl font-black text-slate-900 mb-4 md:mb-6">Tiện ích đặc sắc</h2>
            <div className="grid grid-cols-2 md:grid-cols-2 gap-3 md:gap-4">
              {villa.amenities?.length > 0 ? villa.amenities.map((amenity, idx) => (
                <div key={idx} className="flex items-center gap-2.5 bg-white p-3 md:p-4 rounded-xl md:rounded-2xl border border-slate-100 shadow-sm">
                  <CheckCircle2 className="text-emerald-500" size={18} />
                  <span className="font-bold text-slate-700 text-xs md:text-sm">{amenity}</span>
                </div>
              )) : (
                <p className="text-slate-400 text-xs italic">Chưa có tiện ích nào được liệt kê.</p>
              )}
            </div>
          </section>

          {/* Thông tin căn - CHUYỂN VỀ TÔNG MÀU SÁNG */}
          <section className="bg-white border border-slate-100 p-6 md:p-8 rounded-2xl md:rounded-3xl shadow-sm">
            <h3 className="text-base md:text-lg font-black mb-6 uppercase tracking-widest flex items-center gap-3 text-slate-900">
              <div className="w-1.5 h-6 bg-orange-500 rounded-full"></div>
              Thông tin chi tiết căn
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
              {villa.villa_details && villa.villa_details.length > 0 ? (
                villa.villa_details.map((detail, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3.5 md:p-4 bg-slate-50 rounded-xl border border-slate-100 group hover:border-orange-200 transition-all">
                    <div className="flex items-center gap-2 text-slate-400">
                      <CheckCircle2 size={14} className="text-orange-500" />
                      <span className="font-bold text-[10px] md:text-xs uppercase tracking-tight">{detail.label}</span>
                    </div>
                    <span className="font-black text-xs md:text-sm text-slate-900">{detail.value}</span>
                  </div>
                ))
              ) : (
                <>
                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="flex items-center gap-2 text-slate-400">
                      <Users size={16} />
                      <span className="font-bold text-xs">Sức chứa</span>
                    </div>
                    <span className="font-black text-sm text-slate-900">{(villa.capacity?.adults || 0) + (villa.capacity?.children || 0)} khách</span>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="flex items-center gap-2 text-slate-400">
                      <Bed size={16} />
                      <span className="font-bold text-xs">Phòng ngủ</span>
                    </div>
                    <span className="font-black text-sm text-slate-900">{villa.bedrooms} PN</span>
                  </div>
                </>
              )}
            </div>
          </section>

          <section>
            <div className="flex items-center gap-3 mb-4 md:mb-6">
              <h2 className="text-lg md:text-xl font-black text-slate-900">Hình ảnh thực tế</h2>
              <span className="bg-slate-200 text-slate-600 px-2 py-0.5 rounded-md text-[9px] font-black">
                {villa.images?.length || 0} ẢNH
              </span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
              {villa.images?.map((img, idx) => (
                <div key={idx} className="h-40 md:h-56 rounded-xl md:rounded-[2rem] overflow-hidden shadow-sm hover:shadow-xl transition-all cursor-zoom-in group">
                  <img src={img} className={`w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ${villa.status === 'maintenance' ? 'grayscale' : ''}`} />
                </div>
              ))}
            </div>
          </section>

          <section className="pt-6 md:pt-8 border-t border-slate-100">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <h2 className="text-lg md:text-xl font-black text-slate-900 flex items-center gap-2.5">
                <MapPin className="text-red-500" size={24} />
                Vị trí & Chỉ đường
              </h2>
              {villa.map_link && (
                <a 
                  href={villa.map_link} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 bg-slate-100 text-slate-900 px-4 md:px-6 py-2 md:py-2.5 rounded-xl text-xs font-black hover:bg-orange-600 hover:text-white transition-all"
                >
                  <Navigation size={16} /> Mở Bản đồ
                </a>
              )}
            </div>
            {villa.map_embed_url ? (
              <div className="w-full h-[300px] md:h-[400px] rounded-2xl md:rounded-[2.5rem] overflow-hidden border-4 border-white shadow-lg relative group">
                <iframe 
                  src={villa.map_embed_url}
                  className={`w-full h-full border-0 ${villa.status === 'maintenance' ? 'grayscale' : ''}`}
                  allowFullScreen={true}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                ></iframe>
              </div>
            ) : (
              <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <p className="text-slate-400 font-bold uppercase text-[10px] italic">Bản đồ chưa được tích hợp.</p>
              </div>
            )}
          </section>
        </div>

        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl md:rounded-3xl p-6 md:p-8 shadow-sm md:sticky md:top-8">
            <h3 className="text-sm font-black text-slate-400 mb-6 uppercase tracking-widest text-center">Tác vụ quản trị</h3>
            
            <div className="space-y-3">
              <button 
                onClick={() => router.push('/pricing')}
                className="w-full bg-orange-500 text-white py-3.5 md:py-4 rounded-xl font-black hover:bg-orange-600 transition-all flex items-center justify-center gap-2 shadow-lg shadow-orange-100 text-sm"
              >
                <DollarSign size={18} />
                Cài đặt bảng giá
              </button>
              
              <button 
                onClick={() => router.push(`/villas/edit/${id}`)}
                className="w-full bg-slate-100 text-slate-600 py-3.5 md:py-4 rounded-xl font-black hover:bg-slate-200 transition-all flex items-center justify-center gap-2 text-sm"
              >
                <Edit size={18} />
                Chỉnh sửa thông tin
              </button>
            </div>

            <div className="mt-6 pt-6 border-t border-slate-100">
              <div className="flex items-center gap-3 text-slate-400 mb-4">
                <Info size={16} />
                <span className="text-[10px] font-bold uppercase">Lưu ý quản trị</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed italic">
                Mọi thay đổi về thông tin căn sẽ ảnh hưởng trực tiếp đến dữ liệu hiển thị trên các phiếu đặt và lịch gối đầu.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VillaDetailPage;
