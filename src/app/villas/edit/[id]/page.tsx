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
    <div className="max-w-[1400px] mx-auto space-y-10 animate-in fade-in slide-in-from-bottom duration-700 pb-32 px-4">
      <header className="flex items-center justify-between bg-white/50 backdrop-blur-md sticky top-0 z-10 py-6 -mx-4 px-4 border-b border-slate-100">
        <div className="flex items-center gap-6">
          <button onClick={() => router.back()} className="p-3 bg-white border border-slate-200 rounded-2xl text-slate-500 hover:text-slate-900 hover:shadow-md transition-all">
            <ArrowLeft size={24} />
          </button>
          <div>
            <h1 className="text-3xl font-black text-slate-900">
              {isEdit ? `Chỉnh sửa Villa` : 'Thêm Villa mới'}
            </h1>
            <p className="text-slate-500 font-medium text-sm tracking-tight">Quản lý album ảnh và thông tin chi tiết.</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="px-8 py-4 rounded-2xl font-black text-slate-600 hover:bg-slate-100 transition-all">
            Hủy bỏ
          </button>
          <button 
            onClick={handleSave}
            disabled={saving || !name}
            className="bg-slate-900 hover:bg-orange-600 text-white px-10 py-4 rounded-2xl font-black shadow-xl shadow-slate-200 flex items-center gap-3 transition-all active:scale-95 disabled:opacity-50"
          >
            {saving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
            {saving ? 'Đang tải ảnh...' : (isEdit ? 'Lưu thay đổi' : 'Tạo Villa mới')}
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-8 space-y-10">
          <div className="bg-white border border-slate-200 rounded-[3rem] p-10 shadow-sm space-y-6">
             <div className="flex items-center justify-between border-l-8 border-indigo-500 pl-6">
              <h2 className="text-2xl font-black text-slate-900">Trạng thái vận hành</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button onClick={() => setStatus('active')} className={`p-6 rounded-[2rem] border-2 transition-all text-left space-y-2 ${status === 'active' ? 'border-emerald-500 bg-emerald-50/50 shadow-lg shadow-emerald-100' : 'border-slate-100 bg-slate-50 hover:border-slate-300'}`}>
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${status === 'active' ? 'bg-emerald-500 text-white' : 'bg-white text-slate-400'}`}><Power size={24} /></div>
                <p className={`font-black text-lg ${status === 'active' ? 'text-emerald-700' : 'text-slate-900'}`}>Kinh doanh</p>
              </button>
              <button onClick={() => setStatus('maintenance')} className={`p-6 rounded-[2rem] border-2 transition-all text-left space-y-2 ${status === 'maintenance' ? 'border-orange-500 bg-orange-50/50 shadow-lg shadow-orange-100' : 'border-slate-100 bg-slate-50 hover:border-slate-300'}`}>
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${status === 'maintenance' ? 'bg-orange-500 text-white' : 'bg-white text-slate-400'}`}><AlertCircle size={24} /></div>
                <p className={`font-black text-lg ${status === 'maintenance' ? 'text-orange-700' : 'text-slate-900'}`}>Sửa chữa</p>
              </button>
              <button onClick={() => setStatus('inactive')} className={`p-6 rounded-[2rem] border-2 transition-all text-left space-y-2 ${status === 'inactive' ? 'border-slate-900 bg-slate-100 shadow-lg shadow-slate-200' : 'border-slate-100 bg-slate-50 hover:border-slate-300'}`}>
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${status === 'inactive' ? 'bg-slate-900 text-white' : 'bg-white text-slate-400'}`}><Trash2 size={24} /></div>
                <p className={`font-black text-lg ${status === 'inactive' ? 'text-slate-900' : 'text-slate-900'}`}>Ngừng bán</p>
              </button>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-[3rem] p-12 shadow-sm space-y-10">
            <h2 className="text-2xl font-black text-slate-900 border-l-8 border-orange-500 pl-6">Thông tin giới thiệu</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-3">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Tên Villa hiển thị</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Ví dụ: Villa Blue Ocean Luxury" className="w-full bg-slate-50 border-none rounded-3xl p-5 focus:ring-2 focus:ring-orange-500 transition-all font-bold text-lg" />
              </div>
              <div className="space-y-3">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Địa chỉ / Khu vực</label>
                <input type="text" value={address} onChange={e => setAddress(e.target.value)} placeholder="Ví dụ: Bãi Sau, Vũng Tàu" className="w-full bg-slate-50 border-none rounded-3xl p-5 focus:ring-2 focus:ring-orange-500 transition-all font-bold text-lg" />
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2"><MapPin size={14} className="text-orange-500" /> Link Google Maps</label>
              <input type="text" value={mapLink} onChange={(e) => setMapLink(e.target.value)} placeholder="Dán đường dẫn chia sẻ từ Google Maps vào đây..." className="w-full bg-slate-50 border-none rounded-3xl p-5 focus:ring-2 focus:ring-orange-500 transition-all font-bold text-lg" />
            </div>

            <div className="space-y-3">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Mô tả chi tiết về căn Villa</label>
              <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Mô tả không gian, tầm nhìn, phong cách thiết kế..." rows={8} className="w-full bg-slate-50 border-none rounded-3xl p-6 focus:ring-2 focus:ring-orange-500 transition-all font-bold leading-relaxed text-lg" />
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-[3rem] p-12 shadow-sm space-y-10">
            <div className="flex items-center justify-between border-l-8 border-blue-500 pl-6">
              <div>
                <h2 className="text-2xl font-black text-slate-900">Hình ảnh Villa</h2>
                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">Ảnh đại diện sẽ là ảnh đầu tiên trong album</p>
              </div>
              <div className="flex items-center gap-3">
                {previews.length > 0 && (
                  <button onClick={removeAllImages} className="bg-red-50 text-red-500 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-red-500 hover:text-white transition-all border border-red-100"><Eraser size={18} /> Xóa album</button>
                )}
                <button onClick={() => fileInputRef.current?.click()} className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-blue-700 transition-all shadow-lg shadow-blue-100"><Camera size={18} /> Tải ảnh lên</button>
              </div>
              <input type="file" ref={fileInputRef} onChange={handleImageUpload} multiple accept="image/*" className="hidden" />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {previews.map((item, idx) => (
                <div key={idx} className={`relative aspect-video rounded-3xl overflow-hidden group border-2 transition-all shadow-sm ${coverIndex === idx ? 'border-orange-500 shadow-lg shadow-orange-100 ring-4 ring-orange-50' : 'border-slate-100 hover:border-blue-500'}`}>
                  <img src={item.url} alt="Preview" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button onClick={() => setCoverIndex(idx)} className={`p-2 rounded-xl transition-all ${coverIndex === idx ? 'bg-orange-500 text-white' : 'bg-white text-slate-600 hover:text-orange-500'}`} title="Đặt làm ảnh bìa"><Star size={16} fill={coverIndex === idx ? 'currentColor' : 'none'} /></button>
                    <button onClick={() => removeImage(idx)} className="p-2 bg-white text-slate-600 hover:text-red-500 rounded-xl transition-all" title="Xóa ảnh"><Trash2 size={16} /></button>
                  </div>
                  {coverIndex === idx && (
                    <div className="absolute top-3 left-3 bg-orange-500 text-white text-[8px] font-black uppercase px-2 py-1 rounded-md shadow-lg">Ảnh đại diện</div>
                  )}
                  {item.file && (
                     <div className="absolute top-3 right-3 bg-blue-500 text-white text-[8px] font-black uppercase px-2 py-1 rounded-md shadow-lg">Mới</div>
                  )}
                </div>
              ))}
              <button onClick={() => fileInputRef.current?.click()} className="aspect-video rounded-3xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-300 hover:text-blue-500 hover:border-blue-300 transition-all bg-slate-50/50">
                <Plus size={32} />
                <span className="text-[10px] font-black uppercase mt-2">Thêm ảnh</span>
              </button>
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 space-y-10">
          <div className="bg-white border border-slate-200 rounded-[3rem] p-10 shadow-sm space-y-8">
            <h2 className="text-xl font-black text-slate-900 flex items-center gap-3">
              <div className="w-2 h-8 bg-emerald-500 rounded-full"></div>
              Tiện ích
            </h2>
            
            <div className="space-y-3 max-h-[250px] overflow-y-auto pr-2 custom-scrollbar">
              {amenities.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between bg-slate-50 p-4 pl-5 rounded-2xl group border border-transparent hover:border-emerald-200 transition-all">
                  <div className="flex items-center gap-4">
                    <CheckCircle2 size={20} className="text-emerald-500" />
                    <span className="font-bold text-slate-700">{item}</span>
                  </div>
                  <button onClick={() => setAmenities(amenities.filter((_, i) => i !== idx))} className="p-2 text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"><X size={18} /></button>
                </div>
              ))}
            </div>

            <div className="pt-6 border-t border-slate-100">
               <div className="flex gap-2 mb-3">
                  <input type="text" value={newAmenity} onChange={(e) => setNewAmenity(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleAddAmenity()} placeholder="Thêm tiện ích..." className="flex-1 bg-slate-50 border-none rounded-xl p-3 text-sm font-bold" />
                  <button onClick={handleAddAmenity} className="bg-slate-900 text-white p-3 rounded-xl hover:bg-emerald-600 transition-all"><Plus size={18} /></button>
               </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-[3rem] p-10 shadow-sm space-y-8">
            <h2 className="text-xl font-black text-slate-900 flex items-center gap-3">
              <div className="w-2 h-8 bg-blue-500 rounded-full"></div>
              Chi tiết căn
            </h2>
            
            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
              {villaDetails.map((detail, idx) => (
                <div key={idx} className="flex items-center justify-between bg-slate-50 p-4 pl-5 rounded-2xl group border border-transparent hover:border-blue-200 transition-all">
                  <div className="flex items-center justify-between w-full pr-4">
                    <span className="text-slate-400 font-bold text-xs uppercase tracking-tighter">{detail.label}</span>
                    <span className="font-black text-slate-900">{detail.value}</span>
                  </div>
                  <button onClick={() => setVillaDetails(villaDetails.filter((_, i) => i !== idx))} className="p-2 text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"><X size={18} /></button>
                </div>
              ))}
            </div>

            <div className="pt-6 border-t border-slate-100 space-y-3">
               <div className="flex gap-2">
                  <input type="text" value={newDetailLabel} onChange={(e) => setNewDetailLabel(e.target.value)} placeholder="Tên (Phòng ngủ...)" className="flex-1 bg-slate-50 border-none rounded-xl p-3 text-sm font-bold w-2/3" />
                  <input type="text" value={newDetailValue} onChange={(e) => setNewDetailValue(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleAddDetail()} placeholder="SL" className="w-1/3 bg-slate-50 border-none rounded-xl p-3 text-sm font-bold text-center" />
               </div>
               <button onClick={handleAddDetail} className="w-full bg-slate-100 hover:bg-blue-500 hover:text-white text-slate-600 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all">+ Thêm thông tin</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VillaEditPage;
