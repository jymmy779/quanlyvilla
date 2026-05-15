'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Villa } from '@/types';
import { Plus, MapPin, Users, Bed, Eye, Edit, ImageIcon, AlertCircle, Search, Loader2 } from 'lucide-react';

const VillaListPage = () => {
  const router = useRouter();
  const [villas, setVillas] = useState<Villa[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchVillas();
  }, []);

  const fetchVillas = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('villas')
        .select('*')
        .neq('status', 'inactive')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setVillas(data || []);
    } catch (error) {
      console.error('Error fetching villas:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Villa của tôi</h1>
          <p className="text-slate-500 mt-2 font-medium">Quản lý và cập nhật trạng thái vận hành cho các căn villa.</p>
        </div>
        <Link 
          href="/villas/edit/new"
          className="bg-slate-900 hover:bg-orange-600 text-white px-8 py-3 rounded-2xl font-black shadow-lg shadow-slate-200 flex items-center gap-2 transition-all active:scale-95"
        >
          <Plus size={20} />
          Thêm Villa mới
        </Link>
      </header>

      {loading ? (
        <div className="min-h-[40vh] flex items-center justify-center">
          <Loader2 className="text-orange-500 animate-spin" size={48} />
        </div>
      ) : villas.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {villas.map((villa) => (
            <div key={villa.id} className="bg-white rounded-[2.5rem] overflow-hidden border border-slate-200 shadow-sm group hover:shadow-2xl hover:shadow-slate-200/50 transition-all duration-500 relative">
              
              <div className="absolute top-6 left-6 z-10">
                {villa.status === 'active' ? (
                  <span className="bg-emerald-500 text-white px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-200/50">Đang kinh doanh</span>
                ) : (
                  <span className="bg-orange-500 text-white px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg shadow-orange-200/50 flex items-center gap-2">
                    <AlertCircle size={12} /> Đang sửa chữa
                  </span>
                )}
              </div>

              <div className="relative h-64 overflow-hidden bg-slate-100">
                {villa.images && villa.images.length > 0 ? (
                  <img src={villa.images[0]} alt={villa.name} className={`w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000 ${villa.status === 'maintenance' ? 'grayscale opacity-70' : ''}`} />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-300">
                    <ImageIcon size={48} />
                  </div>
                )}
                <div className="absolute top-6 right-6 bg-white/90 backdrop-blur-md px-4 py-2 rounded-xl text-xs font-black text-slate-900 shadow-sm uppercase tracking-widest flex items-center gap-2">
                  <ImageIcon size={14} />
                  {villa.images?.length || 0} ảnh
                </div>
              </div>
              
              <div className="p-8">
                <div className="flex items-center gap-2 text-slate-400 font-bold text-xs uppercase tracking-widest mb-2 line-clamp-1">
                  <MapPin size={14} className="text-orange-500" />
                  {villa.address}
                </div>
                <h2 className={`text-2xl font-black mb-4 ${villa.status === 'maintenance' ? 'text-slate-400' : 'text-slate-900'}`}>{villa.name}</h2>
                
                <div className="flex items-center gap-6 mb-8 text-slate-500 text-sm font-bold">
                  <div className="flex items-center gap-2">
                    <Users size={18} className="text-slate-400" />
                    {(villa.capacity?.adults || 0) + (villa.capacity?.children || 0)} khách
                  </div>
                  <div className="flex items-center gap-2">
                    <Bed size={18} className="text-slate-400" />
                    {villa.bedrooms} PN
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-6 border-t border-slate-100">
                  <Link 
                    href={`/villas/${villa.id}`}
                    className="flex-1 bg-slate-50 hover:bg-orange-50 text-slate-600 hover:text-orange-600 py-3 rounded-xl font-black text-center transition-all flex items-center justify-center gap-2"
                  >
                    <Eye size={18} />
                    Xem chi tiết
                  </Link>
                  <Link 
                    href={`/villas/edit/${villa.id}`}
                    className="p-3 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors group/btn"
                  >
                    <Edit size={18} className="text-slate-400 group-hover/btn:text-slate-900" />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4 text-center">
          <div className="w-24 h-24 bg-slate-50 rounded-[2rem] flex items-center justify-center text-slate-200">
            <Search size={48} />
          </div>
          <div className="space-y-1">
            <h2 className="text-2xl font-black text-slate-900">Chưa có Villa nào!</h2>
            <p className="text-slate-400 font-medium">Bấm vào nút phía trên để thêm căn Villa đầu tiên của bạn.</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default VillaListPage;
