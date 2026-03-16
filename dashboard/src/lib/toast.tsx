'use client';
import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface Toast { id: string; message: string; type: 'success' | 'error' | 'info'; }
interface ToastContextType { toast: (message: string, type?: Toast['type']) => void; }

const ToastContext = createContext<ToastContextType>({ toast: () => {} });

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((message: string, type: Toast['type'] = 'info') => {
    const id = Date.now().toString(36);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {/* Toast container */}
      <div className="fixed bottom-4 left-4 z-[100] space-y-2" dir="rtl">
        {toasts.map(t => (
          <div key={t.id} className={`flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium animate-[slideIn_0.3s_ease] ${
            t.type === 'success' ? 'bg-green-500 text-white' :
            t.type === 'error' ? 'bg-red-500 text-white' :
            'bg-gray-800 text-white'
          }`}>
            <span>{t.type === 'success' ? '✅' : t.type === 'error' ? '❌' : 'ℹ️'}</span>
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
