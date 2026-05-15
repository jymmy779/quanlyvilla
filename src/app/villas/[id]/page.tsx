'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Villa } from '@/types';
import { ArrowLeft, Users, Bed, Bath, CheckCircle2, MapPin, Edit, ImageIcon, DollarSign, Navigation, AlertCircle, Loader2 } from 'lucide-react';

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
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-slate-500">
        <AlertCircle size={48} className="text-slate-200 mb-4" />
        <p className="text-xl font-black text-slate-900">Không tìm thấy Villa</p>
        <p className="text-slate-400 font-medium">Villa có thể đã bị xóa hoặc đường dẫn không chính xác.</p>
        <button onClick={() => router.push('/villas')} className="mt-6 bg-slate-900 text-white px-8 py-3 rounded-2xl font-black shadow-xl">Quay lại danh sách</button>
      </div>
    );
  }

  return (
    <div className="max-w-[1400px] mx-auto space-y-8 animate-in fade-in slide-in-from-right duration-700 pb-20 px-4">
      <div className="flex items-center justify-between">
        <button 
          onClick={() => router.back()}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-900 font-bold transition-colors p-2"
        >
          <ArrowLeft size={20} />
          Quay lại
        </button>

        <div className="flex items-center gap-4">
          {villa.status === 'active' ? (
            <span className="bg-emerald-50 text-emerald-600 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-emerald-100">Đang kinh doanh</span>
          ) : villa.status === 'maintenance' ? (
            <span className="bg-orange-50 text-orange-600 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-orange-100 flex items-center gap-2"><AlertCircle size={12} /> Đang sửa chữa</span>
          ) : (
            <span className="bg-slate-100 text-slate-500 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-slate-200">Ngừng kinh doanh</span>
          )}

          <button 
            onClick={() => router.push(`/villas/edit/${id}`)}
            className="flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-2xl font-black transition-all hover:bg-orange-600 shadow-xl shadow-slate-200"
          >
            <Edit size={18} />
            Chỉnh sửa
          </button>
        </div>
      </div>

      {/* Hero Section */}
      <div className="relative h-[500px] rounded-[3.5rem] overflow-hidden shadow-2xl shadow-slate-200 bg-slate-100">
        {villa.images && villa.images.length > 0 ? (
          <img src={villa.images[0]} alt={villa.name} className={`w-full h-full object-cover ${villa.status === 'maintenance' ? 'grayscale opacity-70' : ''}`} />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-300">
            <ImageIcon size={64} />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
        <div className="absolute bottom-12 left-12 text-white">
          <div className="flex items-center gap-2 text-orange-400 font-black uppercase tracking-widest text-sm mb-3">
            <MapPin size={16} />
            {villa.address}
          </div>
          <h1 className="text-6xl font-black tracking-tighter">{villa.name}</h1>
          {villa.status === 'maintenance' && (
            <div className="mt-4 flex items-center gap-3 bg-orange-500/20 backdrop-blur-md border border-orange-500/50 px-6 py-3 rounded-2xl w-fit">
              <AlertCircle className="text-orange-400 animate-pulse" />
              <span className="font-black uppercase tracking-widest text-sm text-orange-100">Đang trong quá trình bảo trì / sửa chữa</span>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        <div className="lg:col-span-2 space-y-12">
          <section>
            <h2 className="text-2xl font-black text-slate-900 mb-5">Giới thiệu chung</h2>
            <p className="text-slate-600 leading-relaxed text-lg font-medium">
              {villa.description || 'Chưa có mô tả cho căn Villa này.'}
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-black text-slate-900 mb-6">Tiện ích đặc sắc</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {villa.amenities?.length > 0 ? villa.amenities.map((amenity, idx) => (
                <div key={idx} className="flex items-center gap-3 bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                  <CheckCircle2 className="text-emerald-500" size={22} />
                  <span className="font-bold text-slate-700">{amenity}</span>
                </div>
              )) : (
                <p className="text-slate-400 italic">Chưa có tiện ích nào được liệt kê.</p>
              )}
            </div>
          </section>

          <section>
            <div className="flex items-center gap-3 mb-6">
              <h2 className="text-2xl font-black text-slate-900">Hình ảnh thực tế</h2>
              <span className="bg-slate-100 text-slate-500 px-3 py-1 rounded-full text-xs font-black">
                {villa.images?.length || 0} ẢNH
              </span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {villa.images?.map((img, idx) => (
                <div key={idx} className="h-56 rounded-[2rem] overflow-hidden shadow-sm hover:shadow-2xl transition-all cursor-zoom-in group">
                  <img src={img} className={`w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ${villa.status === 'maintenance' ? 'grayscale' : ''}`} />
                </div>
              ))}
            </div>
          </section>

          <section className="pt-8 border-t border-slate-100">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-black text-slate-900 flex items-center gap-3">
                <MapPin className="text-red-500" size={28} />
                Vị trí & Chỉ đường
              </h2>
              {villa.map_link && (
                <a 
                  href={villa.map_link} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-2xl text-sm font-black hover:bg-orange-600 transition-all shadow-lg"
                >
                  <Navigation size={18} /> Mở Google Maps
                </a>
              )}
            </div>
            {villa.map_embed_url ? (
              <div className="w-full h-[400px] rounded-[2.5rem] overflow-hidden border-4 border-white shadow-2xl relative group">
                <iframe 
                  src={villa.map_embed_url}
                  className={`w-full h-full border-0 ${villa.status === 'maintenance' ? 'grayscale' : ''}`}
                  allowFullScreen={true}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                ></iframe>
              </div>
            ) : (
              <div className="p-10 text-center bg-slate-50 rounded-[2rem] border border-dashed border-slate-200">
                <p className="text-slate-400 font-bold uppercase text-xs italic">Bản đồ chưa được tích hợp cho căn này.</p>
              </div>
            )}
          </section>
        </div>

        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-[3rem] p-10 shadow-sm sticky top-8">
            <h3 className="text-xl font-black text-slate-900 mb-8 text-center uppercase tracking-widest">Thông tin căn</h3>
            <div className="space-y-4">
              {/* Hiển thị villa_details từ database */}
              {villa.villa_details && villa.villa_details.length > 0 ? (
                villa.villa_details.map((detail, idx) => (
                  <div key={idx} className="flex items-center justify-between p-5 bg-slate-50 rounded-2xl">
                    <div className="flex items-center gap-3 text-slate-500">
                      <CheckCircle2 size={16} className="text-blue-500" />
                      <span className="font-bold text-xs uppercase tracking-tight">{detail.label}</span>
                    </div>
                    <span className="font-black text-slate-900">{detail.value}</span>
                  </div>
                ))
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-5 bg-slate-50 rounded-2xl">
                    <div className="flex items-center gap-3 text-slate-500">
                      <Users size={20} />
                      <span className="font-bold">Sức chứa</span>
                    </div>
                    <span className="font-black text-slate-900">Tối đa {(villa.capacity?.adults || 0) + (villa.capacity?.children || 0)} khách</span>
                  </div>
                  <div className="flex items-center justify-between p-5 bg-slate-50 rounded-2xl">
                    <div className="flex items-center gap-3 text-slate-500">
                      <Bed size={20} />
                      <span className="font-bold">Phòng ngủ</span>
                    </div>
                    <span className="font-black text-slate-900">{villa.bedrooms} PN</span>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-10 pt-10 border-t border-slate-100 text-center">
               <button 
                onClick={() => router.push('/pricing')}
                className="w-full bg-slate-100 text-slate-900 py-5 rounded-[1.5rem] font-black hover:bg-orange-50 hover:text-orange-600 transition-all flex items-center justify-center gap-3"
              >
                <DollarSign size={20} />
                Cập nhật bảng giá
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VillaDetailPage;
