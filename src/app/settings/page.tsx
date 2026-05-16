'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import {
  Settings, Save, RotateCcw, Copy, Check,
  Info, MessageSquare, List, Sparkles, ArrowLeft,
  Trash2, Search, Bold, Italic, Underline as UnderlineIcon,
  Type, List as ListIcon, Smile, CaseSensitive,
  ChevronDown, MapPin, Clock, DollarSign, Home, X
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import EmojiPicker, { Theme, EmojiClickData } from 'emoji-picker-react';
import { renderToStaticMarkup } from 'react-dom/server';

const DEFAULT_TEMPLATE = `✍️ XÁC NHẬN TIỀN CỌC VILLA
Địa chỉ: {{villa_address}}
Định vị: {{villa_map_link}}
Khách Hàng: {{customer_name}}
SĐT: {{customer_phone}}
Số lượng khách: {{total_guests}} gồm {{adults}} người lớn và {{children}} trẻ em
⏰Check in: sau 14h ngày {{check_in}}
⏰Check out: trước 12h ngày {{check_out}}
💸Tiền còn lại (thanh toán khi nhận phòng): {{remaining_amount}}

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

const PLACEHOLDERS = [
  { label: 'Tên khách', value: '{{customer_name}}' },
  { label: 'SĐT khách', value: '{{customer_phone}}' },
  { label: 'Ngày Check-in', value: '{{check_in}}' },
  { label: 'Ngày Check-out', value: '{{check_out}}' },
  { label: 'Tên Villa', value: '{{villa_name}}' },
  { label: 'Địa chỉ Villa', value: '{{villa_address}}' },
  { label: 'Link bản đồ', value: '{{villa_map_link}}' },
  { label: 'Tổng khách', value: '{{total_guests}}' },
  { label: 'Người lớn', value: '{{adults}}' },
  { label: 'Trẻ em', value: '{{children}}' },
  { label: 'Tiền còn lại', value: '{{remaining_amount}}' },
];

const BULLET_TYPES = [
  { label: 'Gạch ngang', value: '- ', icon: '-' },
  { label: 'Dấu chấm', value: '• ', icon: '•' },
  { label: 'Số thứ tự', value: '1. ', icon: '1.' },
  { label: 'Dấu tích', value: '✅ ', icon: '✅' },
  { label: 'Ngôi sao', value: '⭐ ', icon: '⭐' },
];

// Helper to convert to Unicode Bold
const toUnicodeBold = (text: string) => {
  const map: any = {
    'A': '𝐀', 'B': '𝐁', 'C': '𝐂', 'D': '𝐃', 'E': '𝐄', 'F': '𝐅', 'G': '𝐆', 'H': '𝐇', 'I': '𝐈', 'J': '𝐉', 'K': '𝐊', 'L': '𝐋', 'M': '𝐌', 'N': '𝐍', 'O': '𝐎', 'P': '𝐏', 'Q': '𝐐', 'R': '𝐑', 'S': '𝐒', 'T': '𝐓', 'U': '𝐔', 'V': '𝐕', 'W': '𝐖', 'X': '𝐗', 'Y': '𝐘', 'Z': '𝐙',
    'a': '𝐚', 'b': '𝐛', 'c': '𝐜', 'd': '𝐝', 'e': '𝐞', 'f': '𝐟', 'g': '𝐠', 'h': '𝐡', 'i': '𝐢', 'j': '𝐣', 'k': '𝐤', 'l': '𝐥', 'm': '𝐦', 'n': '𝐧', 'o': '𝐨', 'p': '𝐩', 'q': '𝐪', 'r': '𝐫', 's': '𝐬', 't': '𝐭', 'u': '𝐮', 'v': '𝐯', 'w': '𝐰', 'x': '𝐱', 'y': '𝐲', 'z': '𝐳',
    '0': '𝟎', '1': '𝟏', '2': '𝟐', '3': '𝟑', '4': '𝟒', '5': '𝟓', '6': '𝟔', '7': '𝟕', '8': '𝟖', '9': '𝟗'
  };
  const reverseMap: any = {};
  Object.entries(map).forEach(([k, v]) => { reverseMap[v as string] = k; });

  const chars = [...text];
  const hasBold = chars.some(c => reverseMap[c]);

  if (hasBold) {
    return chars.map(c => reverseMap[c] || c).join('');
  }
  return chars.map(c => map[c] || c).join('');
};

const toUnicodeItalic = (text: string) => {
  const map: any = {
    'A': '𝘈', 'B': '𝘉', 'C': '𝘊', 'D': '𝘋', 'E': '𝘌', 'F': '𝘍', 'G': '𝘎', 'H': '𝘏', 'I': '𝘐', 'J': '𝘑', 'K': '𝘒', 'L': '𝘓', 'M': '𝘔', 'N': '𝘕', 'O': '𝘖', 'P': '𝘗', 'Q': '𝘘', 'R': '𝘙', 'S': '𝘚', 'T': '𝘛', 'U': '𝘜', 'V': '𝘝', 'W': '𝘞', 'X': '𝘟', 'Y': '𝘠', 'Z': '𝘡',
    'a': '𝘢', 'b': '𝘣', 'c': '𝘤', 'd': '𝘥', 'e': '𝘦', 'f': '𝘧', 'g': '𝘨', 'h': '𝘩', 'i': '𝘪', 'j': '𝘫', 'k': '𝘬', 'l': '𝘭', 'm': '𝘮', 'n': '𝘯', 'o': '𝘰', 'p': '𝘱', 'q': '𝘲', 'r': '𝘳', 's': '𝘴', 't': '𝘵', 'u': '𝘶', 'v': '𝘷', 'w': '𝘸', 'x': '𝘹', 'y': '𝘺', 'z': '𝘻'
  };
  const reverseMap: any = {};
  Object.entries(map).forEach(([k, v]) => { reverseMap[v as string] = k; });

  const chars = [...text];
  const hasItalic = chars.some(c => reverseMap[c]);

  if (hasItalic) {
    return chars.map(c => reverseMap[c] || c).join('');
  }
  return chars.map(c => map[c] || c).join('');
};

const toUnicodeUnderline = (text: string) => {
  if (text.includes('\u0332')) {
    return text.replace(/\u0332/g, '');
  }
  return [...text].map(c => c === ' ' ? ' ' : c + '\u0332').join('');
};

const Badge = ({ label, value }: { label: string, value: string }) => (
  <span
    className="variable-badge bg-indigo-100/50 text-indigo-700 px-2.5 py-1 rounded-md border border-indigo-200 font-bold text-[11px] inline-flex items-center gap-1 mx-0.5 align-middle select-none shadow-sm group/badge"
    data-value={value}
    contentEditable={false}
  >
    {label}
    <span className="delete-badge p-0.5 hover:bg-red-500 hover:text-white rounded transition-all cursor-pointer text-indigo-400 flex items-center justify-center">
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /></svg>
    </span>
  </span>
);

const templateToHtml = (template: string) => {
  let html = template.replace(/\n/g, '<br>');
  PLACEHOLDERS.forEach(p => {
    const badgeHtml = renderToStaticMarkup(<Badge label={p.label} value={p.value} />);
    html = html.split(p.value).join(badgeHtml);
  });
  return html;
};

const htmlToTemplate = (html: string) => {
  const div = document.createElement('div');
  div.innerHTML = html;

  // Convert <br> back to \n
  div.querySelectorAll('br').forEach(br => br.replaceWith('\n'));

  // Convert badges back to {{value}}
  div.querySelectorAll('.variable-badge').forEach(badge => {
    const value = badge.getAttribute('data-value');
    badge.replaceWith(value || '');
  });

  return div.innerText || div.textContent || '';
};

const toggleCase = (text: string) => {
  const boldLower = '𝐚𝐛𝐜𝐝𝐞𝐟𝐠𝐡𝐢𝐣𝐤𝐥𝐦𝐧𝐨𝐩𝐪𝐫𝐬𝐭𝐮𝐯𝐰𝐱𝐲𝐳';
  const boldUpper = '𝐀𝐁𝐂𝐃𝐄𝐅Ｇ𝐇𝐈𝐉𝐊𝐋𝐌𝐍𝐎𝐏Ｑ𝐑𝐒𝐓𝐔𝐕𝐖𝐗𝐘𝐙';
  const italicLower = '𝘢𝘣𝘤𝘥𝘦𝘧𝘨𝘩𝘪𝘫𝘬𝘭𝘮𝘯𝘰𝘱𝘲𝘳𝘴𝘵𝘶𝘷𝘸𝘹𝘺𝘻';
  const italicUpper = '𝘈𝘉𝘊𝘋𝘌𝘍𝘎𝘏𝘐𝘑𝘒𝘓𝘔𝘕𝘖𝘗𝘘𝘙𝘚𝘛𝘜𝘝𝘞𝘟𝘠𝘡';

  const isUpper = (str: string) => {
    const chars = [...str];
    return !chars.some(c =>
      (c >= 'a' && c <= 'z') ||
      [...boldLower].includes(c) ||
      [...italicLower].includes(c)
    );
  };

  const chars = [...text];
  if (isUpper(text)) {
    return chars.map(c => {
      const idxBU = [...boldUpper].indexOf(c);
      if (idxBU !== -1) return [...boldLower][idxBU];
      const idxIU = [...italicUpper].indexOf(c);
      if (idxIU !== -1) return [...italicLower][idxIU];
      return c.toLowerCase();
    }).join('');
  } else {
    return chars.map(c => {
      const idxBL = [...boldLower].indexOf(c);
      if (idxBL !== -1) return [...boldUpper][idxBL];
      const idxIL = [...italicLower].indexOf(c);
      if (idxIL !== -1) return [...italicUpper][idxIL];
      return c.toUpperCase();
    }).join('');
  }
};

const SettingsPage = () => {
  const router = useRouter();
  const [template, setTemplate] = useState(DEFAULT_TEMPLATE);
  const [htmlContent, setHtmlContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const editorRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  useEffect(() => {
    if (!loading && editorRef.current) {
      // Chỉ cập nhật innerHTML nếu editor KHÔNG đang được focus (để tránh mất con trỏ khi gõ)
      // HOẶC nếu nội dung khác biệt hoàn toàn (ví dụ khi nhấn Reset/Load)
      const currentHtml = editorRef.current.innerHTML;
      const newHtml = templateToHtml(template);
      
      if (document.activeElement !== editorRef.current && currentHtml !== newHtml) {
        editorRef.current.innerHTML = newHtml;
      }
    }
  }, [template, loading]);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const { data } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'booking_confirmation_template')
        .single();

      if (data) {
        setTemplate(data.value);
      }
    } catch (err) {
      console.log('Using default template');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const currentTemplate = htmlToTemplate(editorRef.current?.innerHTML || '');
      const { error } = await supabase
        .from('settings')
        .upsert({ key: 'booking_confirmation_template', value: currentTemplate }, { onConflict: 'key' });

      if (error) throw error;

      setTemplate(currentTemplate);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error(err);
      alert('Lỗi khi lưu cài đặt!');
    } finally {
      setSaving(false);
    }
  };

  const insertPlaceholder = (val: string, label?: string) => {
    const editor = editorRef.current;
    if (!editor) return;

    editor.focus();

    if (label) {
      const badgeHtml = renderToStaticMarkup(<Badge label={label} value={val} />);
      document.execCommand('insertHTML', false, badgeHtml);
    } else {
      document.execCommand('insertText', false, val);
    }

    setTemplate(htmlToTemplate(editor.innerHTML));
  };

  const clearAllPlaceholders = () => {
    if (confirm('Bạn có chắc muốn xóa tất cả các biến {{...}} trong nội dung?')) {
      const newTemplate = template.replace(/{{.*?}}/g, '');
      setTemplate(newTemplate);
      setHtmlContent(templateToHtml(newTemplate));
    }
  };

  const transformSelection = (type: 'bold' | 'italic' | 'underline' | 'uppercase' | 'list', bulletStyle?: string) => {
    const editor = editorRef.current;
    if (!editor) return;

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    const selectedText = selection.toString();

    if (!selectedText && type !== 'list') return;

    let newText = '';
    switch (type) {
      case 'bold': newText = toUnicodeBold(selectedText); break;
      case 'italic': newText = toUnicodeItalic(selectedText); break;
      case 'underline': newText = toUnicodeUnderline(selectedText); break;
      case 'uppercase': newText = toggleCase(selectedText); break;
      case 'list':
        const prefix = bulletStyle || '- ';
        if (!selectedText) {
          newText = prefix;
        } else {
          newText = selectedText.split('\n').map((line, idx) => {
            const actualPrefix = prefix === '1. ' ? `${idx + 1}. ` : prefix;
            return line.trim().startsWith(actualPrefix.trim()) ? line : `${actualPrefix}${line}`;
          }).join('\n');
        }
        break;
    }

    editor.focus();
    document.execCommand('insertText', false, newText);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey) {
      switch (e.key.toLowerCase()) {
        case 'b':
          e.preventDefault();
          transformSelection('bold');
          break;
        case 'i':
          e.preventDefault();
          transformSelection('italic');
          break;
        case 'u':
          if (e.shiftKey) {
            e.preventDefault();
            transformSelection('uppercase');
          } else {
            e.preventDefault();
            transformSelection('underline');
          }
          break;
      }
    }
  };

  const [showEmoji, setShowEmoji] = useState(false);
  const [showBullets, setShowBullets] = useState(false);

  const onEmojiClick = (emojiData: EmojiClickData) => {
    insertPlaceholder(emojiData.emoji);
    setShowEmoji(false);
  };

  const renderPreview = () => {
    let result = template;
    const mockData = {
      customer_name: 'Nguyễn Văn A',
      customer_phone: '0901234567',
      check_in: '20/05/2026',
      check_out: '22/05/2026',
      villa_name: 'Villa Sunny Vũng Tàu',
      villa_address: '86/1 Trần Phú, Phường 5, TP. Vũng Tàu',
      villa_map_link: 'https://maps.app.goo.gl/2BYgW3AkMpRccTAj8',
      total_guests: '12',
      adults: '10',
      children: '2',
      remaining_amount: '5.000.000đ',
    };

    Object.entries(mockData).forEach(([key, val]) => {
      result = result.replace(new RegExp(`{{${key}}}`, 'g'), val);
    });

    return result;
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/80 backdrop-blur-md sticky top-0 z-20 py-4 -mx-4 px-4 border-b border-slate-100 mb-6">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-500 hover:text-slate-900 transition-all shadow-sm">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
              <Settings className="text-orange-600" />
              Cài đặt hệ thống
            </h1>
            <p className="text-slate-500 font-medium text-sm mt-0.5">Quản lý các mẫu tin nhắn và cấu hình</p>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold transition-all shadow-lg active:scale-95 ${saved
            ? 'bg-emerald-500 text-white shadow-emerald-500/20'
            : 'bg-slate-900 text-white hover:bg-orange-600 shadow-slate-900/10'
            }`}
        >
          {saving ? <Sparkles className="animate-spin" size={18} /> : (saved ? <Check size={18} /> : <Save size={18} />)}
          {saved ? 'Đã lưu!' : 'Lưu cài đặt'}
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Editor Side */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-50 pb-4">
              <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                <MessageSquare className="text-indigo-500" size={20} />
                Mẫu Xác nhận Tiền cọc
              </h2>
              <button
                onClick={() => { if (confirm('Khôi phục về mẫu mặc định?')) setTemplate(DEFAULT_TEMPLATE) }}
                className="text-slate-400 hover:text-orange-600 transition-colors flex items-center gap-1.5 text-xs font-bold w-fit"
              >
                <RotateCcw size={14} /> Khôi phục mặc định
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex flex-col gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="flex flex-wrap items-center gap-1 border-b border-slate-200 pb-3">
                  <div className="flex items-center gap-0.5 bg-white p-1 rounded-lg border border-slate-200 shadow-sm mr-2">
                    <button onClick={() => transformSelection('bold')} className="p-2 hover:bg-slate-50 rounded-md text-slate-700 font-bold hover:text-indigo-600 transition-colors" title="Chữ Đậm (Ctrl+B)"><Bold size={16} /></button>
                    <button onClick={() => transformSelection('italic')} className="p-2 hover:bg-slate-50 rounded-md text-slate-700 italic hover:text-indigo-600 transition-colors" title="Chữ Nghiêng (Ctrl+I)"><Italic size={16} /></button>
                    <button onClick={() => transformSelection('underline')} className="p-2 hover:bg-slate-50 rounded-md text-slate-700 hover:text-indigo-600 transition-colors underline decoration-2 underline-offset-4" title="Gạch chân (Ctrl+U)"><UnderlineIcon size={16} /></button>
                    <div className="w-[1px] h-4 bg-slate-100 mx-1"></div>
                    <button onClick={() => transformSelection('uppercase')} className="p-2 hover:bg-slate-50 rounded-md text-slate-700 hover:text-indigo-600 transition-colors" title="IN HOA (Ctrl+Shift+U)"><CaseSensitive size={18} /></button>

                    <div className="relative">
                      <button
                        onClick={() => setShowBullets(!showBullets)}
                        className={`p-2 rounded-md transition-colors flex items-center gap-0.5 ${showBullets ? 'bg-indigo-50 text-indigo-600' : 'text-slate-700 hover:bg-slate-50 hover:text-indigo-600'}`}
                        title="Danh sách đầu dòng"
                      >
                        <ListIcon size={16} />
                        <ChevronDown size={10} className={`transition-transform ${showBullets ? 'rotate-180' : ''}`} />
                      </button>
                      {showBullets && (
                        <div className="absolute top-full left-0 mt-2 z-[110] bg-white border border-slate-200 rounded-xl shadow-xl p-1.5 w-[160px] animate-in zoom-in-95 duration-200">
                          {BULLET_TYPES.map(type => (
                            <button
                              key={type.value}
                              onClick={() => { transformSelection('list', type.value); setShowBullets(false); }}
                              className="w-full flex items-center gap-3 px-3 py-2 hover:bg-slate-50 rounded-lg text-xs font-semibold text-slate-600 transition-colors"
                            >
                              <span className="w-5 text-center bg-slate-100 rounded text-[10px] py-0.5">{type.icon}</span>
                              {type.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="relative">
                    <button
                      onClick={() => setShowEmoji(!showEmoji)}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border transition-all text-xs font-bold ${showEmoji ? 'bg-orange-50 border-orange-200 text-orange-600' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                    >
                      <Smile size={16} /> Icon <ChevronDown size={12} className={`transition-transform ${showEmoji ? 'rotate-180' : ''}`} />
                    </button>
                    {showEmoji && (
                      <div className="absolute top-full left-0 mt-2 z-[100] shadow-2xl animate-in zoom-in-95 duration-200">
                        <div
                          className="fixed inset-0"
                          onClick={() => setShowEmoji(false)}
                        ></div>
                        <div className="relative">
                          <EmojiPicker
                            onEmojiClick={onEmojiClick}
                            autoFocusSearch={true}
                            theme={Theme.LIGHT}
                            searchPlaceholder="Tìm icon..."
                            width={320}
                            height={400}
                            previewConfig={{ showPreview: false }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles size={12} className="text-indigo-400" /> 
                    Biến tự động
                  </span>
                  <button
                    onClick={clearAllPlaceholders}
                    className="text-[11px] font-bold text-red-400 hover:text-red-500 flex items-center gap-1.5 transition-colors w-fit"
                  >
                    <Trash2 size={12} /> Xóa sạch các biến
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {PLACEHOLDERS.map((p) => (
                    <button
                      key={p.value}
                      onClick={() => insertPlaceholder(p.value, p.label)}
                      className="px-2.5 py-1.5 bg-white hover:bg-indigo-50 text-slate-500 hover:text-indigo-600 rounded-lg text-[11px] font-bold border border-slate-200 hover:border-indigo-200 transition-all shadow-sm active:scale-95"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="relative group">
                <div
                  ref={editorRef}
                  id="template-editor"
                  contentEditable
                  onInput={(e) => setTemplate(htmlToTemplate(e.currentTarget.innerHTML))}
                  onClick={(e) => {
                    const target = e.target as HTMLElement;
                    const deleteBtn = target.closest('.delete-badge');
                    if (deleteBtn) {
                      target.closest('.variable-badge')?.remove();
                      if (editorRef.current) {
                        setTemplate(htmlToTemplate(editorRef.current.innerHTML));
                      }
                    }
                  }}
                  onPaste={(e) => {
                    e.preventDefault();
                    const text = e.clipboardData.getData('text/plain');
                    document.execCommand('insertText', false, text);
                  }}
                  onFocus={() => setShowEmoji(false)}
                  onKeyDown={handleKeyDown}
                  className="w-full h-[600px] bg-white border-2 border-slate-100 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 rounded-2xl p-8 text-slate-700 font-medium text-sm leading-relaxed outline-none transition-all overflow-y-auto shadow-sm smart-editor"
                />
                <style jsx global>{`
                  .smart-editor .variable-badge {
                    display: inline-flex;
                    align-items: center;
                    background-color: #e0e7ff !important;
                    color: #4338ca !important;
                    border: 1px solid #c7d2fe !important;
                    border-radius: 6px !important;
                    padding: 2px 8px !important;
                    margin: 0 4px !important;
                    font-size: 11px !important;
                    font-weight: 700 !important;
                    line-height: 1.5 !important;
                    user-select: none !important;
                    cursor: default !important;
                    vertical-align: baseline !important;
                  }
                  .smart-editor .delete-badge {
                    display: inline-flex !important;
                    align-items: center;
                    justify-content: center;
                    width: 14px;
                    height: 14px;
                    border-radius: 4px;
                    cursor: pointer !important;
                  }
                  .smart-editor b, .smart-editor strong {
                    font-weight: 800;
                    color: #0f172a;
                  }
                  .smart-editor i, .smart-editor em {
                    font-style: italic;
                    color: #334155;
                  }
                `}</style>
                <div className="absolute bottom-4 right-4 text-[10px] font-bold text-slate-300 uppercase tracking-widest pointer-events-none">
                  Smart Template Editor
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Preview Side */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6 sticky top-28">
            <div className="flex items-center gap-2 border-b border-slate-50 pb-4">
              <Sparkles className="text-orange-500" size={20} />
              <h2 className="text-lg font-semibold text-slate-900">Xem trước (Preview)</h2>
            </div>

            <div className="bg-orange-50/30 rounded-2xl p-6 border border-orange-100/50">
              <div className="whitespace-pre-wrap text-sm text-slate-700 font-medium leading-relaxed font-sans">
                {renderPreview()}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
