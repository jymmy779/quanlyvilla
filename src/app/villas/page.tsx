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
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-700 pb-10 md:pb-16 px-4">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold text-slate-900">Villa hệ thống</h1>
          <p className="text-slate-500 mt-0.5 text-xs md:text-sm font-medium">Quản lý và cập nhật trạng thái vận hành cho các căn.</p>
        </div>
        <Link 
          href="/villas/edit/new"
          className="bg-slate-900 hover:bg-orange-600 text-white px-4 md:px-6 py-2 md:py-2.5 rounded-xl md:rounded-2xl font-semibold text-sm shadow-md flex items-center gap-2 transition-all active:scale-95 flex-shrink-0"
        >
          <Plus size={16} />
          <span className="hidden md:inline">Thêm mới</span>
          <span className="md:hidden">Thêm</span>
        </Link>
      </header>

      {loading ? (
        <div className="min-h-[40vh] flex items-center justify-center">
          <Loader2 className="text-orange-500 animate-spin" size={48} />
        </div>
      ) : villas.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          {villas.map((villa) => (
            <div key={villa.id} className="bg-white rounded-2xl md:rounded-3xl overflow-hidden border border-slate-200 shadow-sm group hover:shadow-xl hover:shadow-slate-200/40 transition-all duration-500 relative">
              
              <div className="absolute top-4 left-4 z-10">
                {villa.status === 'active' ? (
                  <span className="bg-emerald-500 text-white px-3 py-1 rounded-full text-xs font-semibold shadow-lg shadow-emerald-200/40">Kinh doanh</span>
                ) : (
                  <span className="bg-orange-500 text-white px-3 py-1 rounded-full text-xs font-semibold shadow-lg shadow-orange-200/40 flex items-center gap-1.5">
                    <AlertCircle size={10} /> Sửa chữa
                  </span>
                )}
              </div>

              <div className="relative h-48 md:h-56 overflow-hidden bg-slate-100">
                {villa.images && villa.images.length > 0 ? (
                  <img src={villa.images[0]} alt={villa.name} className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000 ${villa.status === 'maintenance' ? 'grayscale opacity-70' : ''}`} />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-300">
                    <ImageIcon size={32} />
                  </div>
                )}
                <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-900 shadow-sm flex items-center gap-1.5">
                  <ImageIcon size={12} />
                  {villa.images?.length || 0}
                </div>
              </div>
              
              <div className="p-4 md:p-6">
                <div className="flex items-center gap-1.5 text-slate-400 font-medium text-sm mb-1 line-clamp-1">
                  <MapPin size={12} className="text-orange-500" />
                  {villa.address}
                </div>
                <h2 className={`text-lg md:text-xl font-semibold mb-3 ${villa.status === 'maintenance' ? 'text-slate-400' : 'text-slate-900'}`}>{villa.name}</h2>
                
                <div className="flex items-center gap-4 mb-4 md:mb-6 text-slate-500 text-sm font-medium">
                  <div className="flex items-center gap-1.5">
                    <Users size={16} className="text-slate-400" />
                    {(villa.capacity?.adults || 0) + (villa.capacity?.children || 0)} khách
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Bed size={16} className="text-slate-400" />
                    {villa.bedrooms} PN
                  </div>
                </div>
 
                <div className="flex items-center gap-2 md:gap-3 pt-4 md:pt-5 border-t border-slate-100">
                  <Link 
                    href={`/villas/${villa.id}`}
                    className="flex-1 bg-slate-50 hover:bg-orange-50 text-slate-600 hover:text-orange-600 py-2 md:py-2.5 rounded-lg md:rounded-xl font-semibold text-sm text-center transition-all flex items-center justify-center gap-2"
                  >
                    <Eye size={16} />
                    Chi tiết
                  </Link>
                  <Link 
                    href={`/villas/edit/${villa.id}`}
                    className="p-2 md:p-2.5 bg-slate-50 hover:bg-slate-100 rounded-lg md:rounded-xl transition-colors group/btn"
                  >
                    <Edit size={16} className="text-slate-400 group-hover/btn:text-slate-900" />
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
            <h2 className="text-2xl font-semibold text-slate-900">Chưa có Villa nào!</h2>
            <p className="text-slate-400 font-medium">Bấm vào nút phía trên để thêm căn Villa đầu tiên của bạn.</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default VillaListPage;
