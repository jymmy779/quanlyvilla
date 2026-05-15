'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Save, Plus, X, Upload, Image as ImageIcon, Trash2, CheckCircle2, Star, Info, AlertCircle, Power, MapPin, Loader2, ListTree, Camera, Eraser } from 'lucide-react';
import { VillaStatus, Villa, VillaDetailItem } from '@/types';

const VillaEditPage = () => {
  const { id } = useParams();
  const router = useRouter();
  const isEdit = id && id !== 'new';

  // States
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<VillaStatus>('active');
  const [amenities, setAmenities] = useState<string[]>([]);
  const [villaDetails, setVillaDetails] = useState<VillaDetailItem[]>([]);
  const [mapLink, setMapLink] = useState('');
  const [previews, setPreviews] = useState<{ url: string; file?: File }[]>([]);
  const [coverIndex, setCoverIndex] = useState(0);
  
  const [newAmenity, setNewAmenity] = useState('');
  const [newDetailLabel, setNewDetailLabel] = useState('');
  const [newDetailValue, setNewDetailValue] = useState('');
  
  const [bedrooms, setBedrooms] = useState(5);
  const [bathrooms, setBathrooms] = useState(6);
  const [capacity, setCapacity] = useState({ adults: 15, children: 5 });

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEdit) {
      fetchVilla();
    }
  }, [id]);

  const fetchVilla = async () => {
    try {
      const { data, error } = await supabase
        .from('villas')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      if (data) {
        setName(data.name);
        setAddress(data.address);
        setDescription(data.description);
        setStatus(data.status);
        setAmenities(data.amenities || []);
        setVillaDetails(data.villa_details || []);
        setMapLink(data.map_link || '');
        
        // LỌC BỎ các link blob: cũ đã hỏng nếu có
        const initialImages = (data.images || [])
          .filter((url: string) => !url.startsWith('blob:')) 
          .map((url: string) => ({ url }));
          
        setPreviews(initialImages);
        setBedrooms(data.bedrooms || 5);
        setBathrooms(data.bathrooms || 6);
        setCapacity(data.capacity || { adults: 15, children: 5 });
        setCoverIndex(0);
      }
    } catch (error) {
      console.error('Error fetching villa:', error);
      alert('Không tìm thấy Villa!');
      router.push('/villas');
    } finally {
      setLoading(false);
    }
  };

  const uploadImages = async () => {
    const uploadedUrls: string[] = [];
    
    for (const item of previews) {
      if (item.file) {
        const fileExt = item.file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `villa-photos/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('villas')
          .upload(filePath, item.file);

        if (uploadError) {
          console.error('Lỗi upload:', uploadError);
          continue;
        }

        const { data: { publicUrl } } = supabase.storage
          .from('villas')
          .getPublicUrl(filePath);
          
        uploadedUrls.push(publicUrl);
      } else if (!item.url.startsWith('blob:')) {
        // Chỉ giữ lại những ảnh có URL thật (không phải blob)
        uploadedUrls.push(item.url);
      }
    }
    
    return uploadedUrls;
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const finalImageUrls = await uploadImages();

      if (coverIndex >= 0 && coverIndex < finalImageUrls.length) {
        const coverImg = finalImageUrls.splice(coverIndex, 1)[0];
        finalImageUrls.unshift(coverImg);
      }

      const villaData = {
        name,
        address,
        description,
        status,
        amenities,
        villa_details: villaDetails,
        map_link: mapLink,
        images: finalImageUrls,
        bedrooms,
        bathrooms,
        capacity,
        price: 5000000, 
        monthly_prices: [] 
      };

      let result;
      if (isEdit) {
        result = await supabase
          .from('villas')
          .update(villaData)
          .eq('id', id);
      } else {
        result = await supabase
          .from('villas')
          .insert([villaData]);
      }

      if (result.error) throw result.error;
      
      alert(isEdit ? 'Đã cập nhật thành công!' : 'Đã thêm Villa mới thành công!');
      router.push('/villas');
    } catch (error) {
      console.error('Error saving villa:', error);
      alert('Có lỗi xảy ra khi lưu dữ liệu!');
    } finally {
      setSaving(false);
    }
  };

  const handleAddAmenity = () => {
    if (newAmenity.trim()) {
      setAmenities([...amenities, newAmenity.trim()]);
      setNewAmenity('');
    }
  };

  const handleAddDetail = () => {
    if (newDetailLabel.trim() && newDetailValue.trim()) {
      setVillaDetails([...villaDetails, { label: newDetailLabel.trim(), value: newDetailValue.trim() }]);
      setNewDetailLabel('');
      setNewDetailValue('');
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const newItems = Array.from(files).map(file => ({
        url: URL.createObjectURL(file),
        file: file
      }));
      setPreviews([...previews, ...newItems]);
    }
  };

  const removeImage = (index: number) => {
    const newPreviews = [...previews];
    newPreviews.splice(index, 1);
    setPreviews(newPreviews);
    if (coverIndex === index) {
      setCoverIndex(0);
    } else if (coverIndex > index) {
      setCoverIndex(coverIndex - 1);
    }
  };

  const removeAllImages = () => {
    if (window.confirm('Bạn có chắc chắn muốn xóa toàn bộ ảnh trong album này không?')) {
      setPreviews([]);
      setCoverIndex(0);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="text-orange-500 animate-spin" size={48} />
      </div>
    );
  }

  return (
    <div className="max-w-[1100px] mx-auto space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom duration-700 pb-24 px-4 mt-6 md:mt-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/80 backdrop-blur-md sticky top-0 z-20 py-4 -mx-4 px-4 border-b border-slate-100 mb-6">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-500 hover:text-slate-900 transition-all shadow-sm">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
              {isEdit ? `Chỉnh sửa Villa` : 'Thêm Villa mới'}
            </h1>
            <p className="text-slate-500 font-bold text-[10px] md:text-xs uppercase tracking-widest mt-0.5">Cập nhật dữ liệu hệ thống</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="px-4 py-2 rounded-xl font-black text-xs text-slate-600 hover:bg-slate-100 transition-all">
            Hủy
          </button>
          <button 
            onClick={handleSave}
            disabled={saving || !name}
            className="bg-slate-900 hover:bg-orange-600 text-white px-6 py-2.5 rounded-xl font-black text-xs shadow-lg flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50"
          >
            {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
            {saving ? 'Đang lưu...' : (isEdit ? 'Lưu thay đổi' : 'Tạo Villa')}
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">
        <div className="lg:col-span-8 space-y-6 md:space-y-8">
          <div className="bg-white border border-slate-200 rounded-2xl md:rounded-3xl p-6 md:p-8 shadow-sm space-y-6">
             <div className="flex items-center border-l-4 border-indigo-500 pl-4">
              <h2 className="text-base md:text-lg font-black text-slate-900 uppercase tracking-tight">Trạng thái vận hành</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <button onClick={() => setStatus('active')} className={`p-4 rounded-xl md:rounded-2xl border-2 transition-all text-left space-y-2 ${status === 'active' ? 'border-emerald-500 bg-emerald-50/50' : 'border-slate-100 bg-slate-50 hover:border-slate-200'}`}>
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${status === 'active' ? 'bg-emerald-500 text-white' : 'bg-white text-slate-400'}`}><Power size={20} /></div>
                <p className={`font-black text-xs md:text-sm ${status === 'active' ? 'text-emerald-700' : 'text-slate-900'}`}>Kinh doanh</p>
              </button>
              <button onClick={() => setStatus('maintenance')} className={`p-4 rounded-xl md:rounded-2xl border-2 transition-all text-left space-y-2 ${status === 'maintenance' ? 'border-orange-500 bg-orange-50/50' : 'border-slate-100 bg-slate-50 hover:border-slate-200'}`}>
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${status === 'maintenance' ? 'bg-orange-500 text-white' : 'bg-white text-slate-400'}`}><AlertCircle size={20} /></div>
                <p className={`font-black text-xs md:text-sm ${status === 'maintenance' ? 'text-orange-700' : 'text-slate-900'}`}>Sửa chữa</p>
              </button>
              <button onClick={() => setStatus('inactive')} className={`p-4 rounded-xl md:rounded-2xl border-2 transition-all text-left space-y-2 ${status === 'inactive' ? 'border-slate-900 bg-slate-100' : 'border-slate-100 bg-slate-50 hover:border-slate-200'}`}>
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${status === 'inactive' ? 'bg-slate-900 text-white' : 'bg-white text-slate-400'}`}><Trash2 size={20} /></div>
                <p className={`font-black text-xs md:text-sm ${status === 'inactive' ? 'text-slate-900' : 'text-slate-900'}`}>Ngừng bán</p>
              </button>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl md:rounded-3xl p-6 md:p-8 shadow-sm space-y-6 md:space-y-8">
            <h2 className="text-base md:text-lg font-black text-slate-900 border-l-4 border-orange-500 pl-4 uppercase tracking-tight">Thông tin giới thiệu</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tên Villa</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Villa Blue Ocean Luxury" className="w-full bg-slate-50 border-none rounded-xl p-3 md:p-4 focus:ring-2 focus:ring-orange-500 transition-all font-bold text-sm md:text-base" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Địa chỉ / Khu vực</label>
                <input type="text" value={address} onChange={e => setAddress(e.target.value)} placeholder="Bãi Sau, Vũng Tàu" className="w-full bg-slate-50 border-none rounded-xl p-3 md:p-4 focus:ring-2 focus:ring-orange-500 transition-all font-bold text-sm md:text-base" />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1.5"><MapPin size={12} className="text-orange-500" /> Google Maps</label>
              <input type="text" value={mapLink} onChange={(e) => setMapLink(e.target.value)} placeholder="Dán link Maps vào đây..." className="w-full bg-slate-50 border-none rounded-xl p-3 md:p-4 focus:ring-2 focus:ring-orange-500 transition-all font-bold text-sm md:text-base" />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Mô tả chi tiết</label>
              <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Mô tả không gian, tầm nhìn..." rows={6} className="w-full bg-slate-50 border-none rounded-xl p-4 md:p-6 focus:ring-2 focus:ring-orange-500 transition-all font-bold leading-relaxed text-sm md:text-base" />
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl md:rounded-3xl p-6 md:p-8 shadow-sm space-y-6 md:space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-l-4 border-blue-500 pl-4">
              <div>
                <h2 className="text-base md:text-lg font-black text-slate-900 uppercase tracking-tight">Hình ảnh Villa</h2>
                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-0.5">Ảnh bìa là ảnh đầu tiên</p>
              </div>
              <div className="flex items-center gap-2">
                {previews.length > 0 && (
                  <button onClick={removeAllImages} className="bg-red-50 text-red-500 px-3 py-2 rounded-lg font-black text-[10px] uppercase tracking-widest flex items-center gap-1.5 hover:bg-red-500 hover:text-white transition-all border border-red-100"><Eraser size={14} /> Xóa album</button>
                )}
                <button onClick={() => fileInputRef.current?.click()} className="bg-blue-600 text-white px-3 py-2 rounded-lg font-black text-[10px] uppercase tracking-widest flex items-center gap-1.5 hover:bg-blue-700 transition-all shadow-md"><Camera size={14} /> Tải ảnh</button>
              </div>
              <input type="file" ref={fileInputRef} onChange={handleImageUpload} multiple accept="image/*" className="hidden" />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
              {previews.map((item, idx) => (
                <div key={idx} className={`relative aspect-video rounded-xl md:rounded-2xl overflow-hidden group border-2 transition-all shadow-sm ${coverIndex === idx ? 'border-orange-500 shadow-md ring-4 ring-orange-50' : 'border-slate-100 hover:border-blue-500'}`}>
                  <img src={item.url} alt="Preview" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5">
                    <button onClick={() => setCoverIndex(idx)} className={`p-1.5 rounded-lg transition-all ${coverIndex === idx ? 'bg-orange-500 text-white' : 'bg-white text-slate-600 hover:text-orange-500'}`}><Star size={14} fill={coverIndex === idx ? 'currentColor' : 'none'} /></button>
                    <button onClick={() => removeImage(idx)} className="p-1.5 bg-white text-slate-600 hover:text-red-500 rounded-lg transition-all"><Trash2 size={14} /></button>
                  </div>
                  {coverIndex === idx && (
                    <div className="absolute top-2 left-2 bg-orange-500 text-white text-[7px] font-black uppercase px-1.5 py-0.5 rounded shadow-lg">Ảnh bìa</div>
                  )}
                </div>
              ))}
              <button onClick={() => fileInputRef.current?.click()} className="aspect-video rounded-xl md:rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-300 hover:text-blue-500 hover:border-blue-300 transition-all bg-slate-50/50">
                <Plus size={24} />
                <span className="text-[9px] font-black uppercase mt-1">Thêm ảnh</span>
              </button>
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 space-y-6 md:space-y-8">
          <div className="bg-white border border-slate-200 rounded-2xl md:rounded-3xl p-6 md:p-8 shadow-sm space-y-6">
            <h2 className="text-base md:text-lg font-black text-slate-900 flex items-center gap-2.5">
              <div className="w-1.5 h-6 md:h-7 bg-emerald-500 rounded-full"></div>
              Tiện ích
            </h2>
            
            <div className="space-y-2 max-h-[250px] overflow-y-auto pr-2 custom-scrollbar">
              {amenities.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between bg-slate-50 p-3 md:p-3.5 pl-4 rounded-xl group border border-transparent hover:border-emerald-200 transition-all">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 size={16} className="text-emerald-500" />
                    <span className="font-bold text-xs md:text-sm text-slate-700">{item}</span>
                  </div>
                  <button onClick={() => setAmenities(amenities.filter((_, i) => i !== idx))} className="p-1.5 text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"><X size={16} /></button>
                </div>
              ))}
            </div>

            <div className="pt-4 border-t border-slate-100">
               <div className="flex gap-2">
                  <input type="text" value={newAmenity} onChange={(e) => setNewAmenity(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleAddAmenity()} placeholder="Thêm tiện ích..." className="flex-1 bg-slate-50 border-none rounded-lg p-2.5 text-xs font-bold" />
                  <button onClick={handleAddAmenity} className="bg-slate-900 text-white p-2.5 rounded-lg hover:bg-emerald-600 transition-all"><Plus size={16} /></button>
               </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl md:rounded-3xl p-6 md:p-8 shadow-sm space-y-6">
            <h2 className="text-base md:text-lg font-black text-slate-900 flex items-center gap-2.5">
              <div className="w-1.5 h-6 md:h-7 bg-blue-500 rounded-full"></div>
              Chi tiết căn
            </h2>
            
            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
              {villaDetails.map((detail, idx) => (
                <div key={idx} className="flex items-center justify-between bg-slate-50 p-3 md:p-3.5 pl-4 rounded-xl group border border-transparent hover:border-blue-200 transition-all">
                  <div className="flex items-center justify-between w-full pr-2">
                    <span className="text-slate-400 font-bold text-[10px] uppercase tracking-tighter">{detail.label}</span>
                    <span className="font-black text-xs md:text-sm text-slate-900">{detail.value}</span>
                  </div>
                  <button onClick={() => setVillaDetails(villaDetails.filter((_, i) => i !== idx))} className="p-1.5 text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"><X size={16} /></button>
                </div>
              ))}
            </div>

            <div className="pt-4 border-t border-slate-100 space-y-2">
               <div className="flex gap-2">
                  <input type="text" value={newDetailLabel} onChange={(e) => setNewDetailLabel(e.target.value)} placeholder="Tên nhãn" className="flex-1 bg-slate-50 border-none rounded-lg p-2.5 text-xs font-bold w-2/3" />
                  <input type="text" value={newDetailValue} onChange={(e) => setNewDetailValue(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleAddDetail()} placeholder="SL" className="w-1/3 bg-slate-50 border-none rounded-lg p-2.5 text-xs font-bold text-center" />
               </div>
               <button onClick={handleAddDetail} className="w-full bg-slate-100 hover:bg-blue-500 hover:text-white text-slate-600 py-2.5 rounded-lg font-black text-[9px] uppercase tracking-widest transition-all">+ Thêm thông tin</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VillaEditPage;
