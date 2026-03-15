'use client';
import React, { useState } from 'react';

const nav = [
  { href: '/', label: 'المحادثات', icon: '💬', badge: 12 },
  { href: '/products', label: 'المنتجات', icon: '🛍️' },
  { href: '/orders', label: 'الطلبات', icon: '📦', badge: 3 },
  { href: '/contacts', label: 'العملاء', icon: '👥' },
  { href: '/chatbots', label: 'البوتات', icon: '🤖' },
  { href: '/broadcasts', label: 'الحملات', icon: '📢' },
  { href: '/automation', label: 'الأتمتة', icon: '⚡' },
  { href: '/analytics', label: 'التحليلات', icon: '📊' },
  { href: '/whatsapp', label: 'واتساب', icon: '📱' },
  { href: '/settings', label: 'الإعدادات', icon: '⚙️' },
];

export default function DashboardLayout({ children, activePath = '/' }: { children: React.ReactNode; activePath?: string }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden" dir="rtl">
      {/* Mobile overlay */}
      {sidebarOpen && <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* Sidebar */}
      <aside className={`fixed lg:static top-0 right-0 z-50 h-full w-56 bg-white border-l border-gray-200 shadow-lg lg:shadow-none transform transition-transform lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'} flex flex-col`}>
        <div className="h-14 flex items-center gap-2 px-4 border-b border-gray-100 shrink-0">
          <div className="h-8 w-8 rounded-lg bg-green-500 flex items-center justify-center text-white text-sm font-bold">W</div>
          <span className="font-bold text-gray-900">WasslChat</span>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden mr-auto text-gray-400">✕</button>
        </div>
        <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
          {nav.map(n => (
            <a key={n.href} href={n.href} onClick={() => setSidebarOpen(false)}
              className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activePath === n.href ? 'bg-green-50 text-green-700' : 'text-gray-600 hover:bg-gray-50'}`}>
              <span className="flex items-center gap-2"><span>{n.icon}</span>{n.label}</span>
              {n.badge && <span className="bg-green-500 text-white text-xs rounded-full px-1.5 min-w-[18px] text-center">{n.badge}</span>}
            </a>
          ))}
        </nav>
        <div className="p-3 border-t border-gray-100 shrink-0">
          <div className="flex items-center gap-2 px-2">
            <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center text-sm font-bold text-gray-600">أ</div>
            <div><p className="text-sm font-medium text-gray-900">أحمد</p><p className="text-xs text-gray-400">admin</p></div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto bg-gray-50">
        {/* Mobile Header */}
        <div className="lg:hidden sticky top-0 z-30 flex items-center gap-3 h-14 px-4 bg-white border-b border-gray-200">
          <button onClick={() => setSidebarOpen(true)} className="text-gray-600 text-xl">☰</button>
          <span className="font-bold text-gray-900">WasslChat</span>
        </div>
        {children}
      </div>
    </div>
  );
}
