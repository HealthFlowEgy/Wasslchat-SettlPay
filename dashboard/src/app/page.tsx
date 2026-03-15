'use client';
import React, { useState } from 'react';

const nav = [
  { label: 'المحادثات', badge: 12 }, { label: 'المنتجات' }, { label: 'الطلبات', badge: 3 },
  { label: 'العملاء' }, { label: 'المدفوعات' }, { label: 'البوتات' },
  { label: 'الحملات' }, { label: 'التحليلات' }, { label: 'الإعدادات' },
];

const convs = [
  { id:'1', name:'أحمد محمد', msg:'عايز أطلب السماعات اللاسلكية', time:'٥ دقائق', unread:3 },
  { id:'2', name:'سارة أحمد', msg:'الطلب وصل شكراً ❤️', time:'١٥ دقيقة', unread:0 },
  { id:'3', name:'محمد علي', msg:'الدفع عن طريق فوري ممكن؟', time:'ساعة', unread:1 },
  { id:'4', name:'فاطمة حسن', msg:'عايزة أرجع المنتج', time:'٢ ساعة', unread:0 },
];

const msgs = [
  { dir:'in', text:'السلام عليكم', t:'10:30' },
  { dir:'out', text:'وعليكم السلام! أهلاً بيك 🙌', t:'10:31' },
  { dir:'in', text:'عايز أطلب السماعات اللاسلكية', t:'10:32' },
  { dir:'out', text:'تمام! السماعات متوفرة بسعر ٤٥٠ ج.م\n📦 التوصيل خلال ٢-٣ أيام\nعايز تأكد الطلب؟', t:'10:33' },
  { dir:'in', text:'أيوه عايز أطلب', t:'10:35' },
];

export default function Dashboard() {
  const [sel, setSel] = useState(convs[0]);
  const [input, setInput] = useState('');

  return (
    <div className="flex h-screen overflow-hidden font-sans" dir="rtl">
      {/* Sidebar */}
      <aside className="w-56 bg-white border-l border-gray-200 flex flex-col">
        <div className="h-14 flex items-center gap-2 px-4 border-b border-gray-100">
          <div className="h-8 w-8 rounded-lg bg-green-500 flex items-center justify-center text-white text-sm font-bold">W</div>
          <span className="font-bold text-gray-900">WasslChat</span>
        </div>
        <nav className="flex-1 p-2 space-y-0.5">
          {nav.map((n,i) => (
            <a key={i} className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium ${i===0?'bg-green-50 text-green-700':'text-gray-600 hover:bg-gray-50'}`}>
              {n.label}
              {n.badge && <span className="bg-green-500 text-white text-xs rounded-full px-1.5">{n.badge}</span>}
            </a>
          ))}
        </nav>
      </aside>

      {/* Conversation List */}
      <div className="w-80 border-l border-gray-200 bg-white flex flex-col">
        <div className="h-14 flex items-center px-4 border-b border-gray-100"><h2 className="font-semibold text-gray-900">المحادثات</h2></div>
        <div className="p-3"><input placeholder="بحث..." className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:border-green-500" /></div>
        <div className="flex-1 overflow-y-auto">
          {convs.map(c => (
            <button key={c.id} onClick={() => setSel(c)} className={`w-full flex items-center gap-3 p-3 border-b border-gray-50 hover:bg-gray-50 text-right ${sel.id===c.id?'bg-green-50':''}`}>
              <div className={`h-10 w-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0 ${c.unread?'bg-green-500':'bg-gray-300'}`}>{c.name[0]}</div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between"><span className="text-sm font-medium text-gray-900">{c.name}</span><span className="text-xs text-gray-400">{c.time}</span></div>
                <div className="flex justify-between mt-0.5"><span className="text-xs text-gray-500 truncate">{c.msg}</span>{c.unread>0&&<span className="bg-green-500 text-white text-xs rounded-full px-1.5">{c.unread}</span>}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col" style={{background:'#efeae2'}}>
        <div className="h-14 flex items-center gap-3 px-4 bg-white border-b border-gray-200">
          <div className="h-9 w-9 rounded-full bg-green-500 flex items-center justify-center text-white font-bold text-sm">{sel.name[0]}</div>
          <div><p className="text-sm font-semibold text-gray-900">{sel.name}</p><p className="text-xs text-green-500">متصل</p></div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {msgs.map((m,i) => (
            <div key={i} className={`flex ${m.dir==='out'?'justify-start':'justify-end'}`}>
              <div className={`max-w-[70%] rounded-2xl px-4 py-2 shadow-sm ${m.dir==='out'?'bg-[#d9fdd3] rounded-tl-sm':'bg-white rounded-tr-sm'}`}>
                <p className="text-sm text-gray-900 whitespace-pre-wrap">{m.text}</p>
                <p className="text-[10px] text-gray-400 text-left mt-1">{m.t}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="p-3 bg-white border-t border-gray-200">
          <div className="flex items-center gap-2">
            <input value={input} onChange={e=>setInput(e.target.value)} placeholder="اكتب رسالة..." className="flex-1 rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none focus:border-green-500" />
            <button className="p-2.5 rounded-lg bg-green-500 hover:bg-green-600 text-white">
              <svg className="h-5 w-5 rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
