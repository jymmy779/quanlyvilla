'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Check, AlertCircle, HelpCircle, X } from 'lucide-react';

type ToastType = 'success' | 'error';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ConfirmOptions {
  title: string;
  message: string;
  onConfirm: () => void;
  confirmText?: string;
  cancelText?: string;
}

interface NotificationContextType {
  showToast: (message: string, type?: ToastType) => void;
  confirm: (options: ConfirmOptions) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [confirmModal, setConfirmModal] = useState<ConfirmOptions | null>(null);

  const showToast = (message: string, type: ToastType = 'success') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  };

  const confirm = (options: ConfirmOptions) => {
    setConfirmModal(options);
  };

  return (
    <NotificationContext.Provider value={{ showToast, confirm }}>
      {children}

      {/* Global Toasts */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[300] flex flex-col gap-3 items-center">
        {toasts.map((toast) => (
          <div 
            key={toast.id}
            className={`flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl border animate-in slide-in-from-bottom-8 duration-300 ${
              toast.type === 'success' ? 'bg-emerald-500 border-emerald-400 text-white' : 'bg-red-500 border-red-400 text-white'
            }`}
          >
            {toast.type === 'success' ? <Check size={18} /> : <AlertCircle size={18} />}
            <span className="font-bold text-sm">{toast.message}</span>
          </div>
        ))}
      </div>

      {/* Global Confirm Modal */}
      {confirmModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setConfirmModal(null)}></div>
          <div className="relative bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-200 border border-slate-100">
            <div className="w-16 h-16 bg-orange-50 rounded-2xl flex items-center justify-center mb-6">
              <HelpCircle className="text-orange-600" size={32} />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">{confirmModal.title}</h3>
            <p className="text-slate-500 text-sm leading-relaxed mb-8">{confirmModal.message}</p>
            <div className="flex gap-3">
              <button 
                onClick={() => setConfirmModal(null)}
                className="flex-1 px-4 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-50 transition-colors"
              >
                {confirmModal.cancelText || 'Hủy bỏ'}
              </button>
              <button 
                onClick={() => {
                  confirmModal.onConfirm();
                  setConfirmModal(null);
                }}
                className="flex-1 px-4 py-3 rounded-xl font-bold bg-orange-600 text-white hover:bg-orange-700 shadow-lg shadow-orange-600/20 transition-all active:scale-95"
              >
                {confirmModal.confirmText || 'Đồng ý'}
              </button>
            </div>
          </div>
        </div>
      )}
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};
