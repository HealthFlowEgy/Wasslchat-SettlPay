'use client';
import React from 'react';

const bots = [
  { id:'1', name:'ترحيب العملاء', trigger:'مرحبا', type:'keyword', status:'ACTIVE', triggered:1250, completed:1100 },
  { id:'2', name:'استفسار الأسعار', trigger:'سعر|كم|price', type:'regex', status:'ACTIVE', triggered:890, completed:720 },
  { id:'3', name:'تتبع الطلب', trigger:'طلبي|اين طلب|تتبع', type:'regex', status:'ACTIVE', triggered:560, completed:480 },
  { id:'4', name:'شكاوي', trigger:'مشكلة|شكوى', type:'keyword', status:'INACTIVE', triggered:120, completed:45 },
  { id:'5', name:'كتالوج المنتجات', trigger:'كتالوج|منتجات|عرض', type:'keyword', status:'DRAFT', triggered:0, completed:0 },
];
const statusC: Record<string,string> = { ACTIVE:'bg-green-100 text-green-700', INACTIVE:'bg-gray-100 text-gray-600', DRAFT:'bg-amber-100 text-amber-700' };
const statusAr: Record<string,string> = { ACTIVE:'نشط', INACTIVE:'معطّل', DRAFT:'مسودة' };

export default function ChatbotsPage() {
  return (
    <div className="p-6 space-y-6" dir="rtl">
      <div className="flex items-center justify-between"><h1 className="text-2xl font-bold text-gray-900">البوتات</h1><button className="px-4 py-2 rounded-lg bg-green-500 hover:bg-green-600 text-white text-sm font-medium">+ بوت جديد</button></div>
      <div className="grid gap-4">{bots.map(b=>(
        <div key={b.id} className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3"><h3 className="font-semibold text-gray-900">{b.name}</h3><span className={`inline-flex px-2 py-0.5 rounded-md text-xs font-medium ${statusC[b.status]}`}>{statusAr[b.status]}</span></div>
            <div className="flex gap-2"><button className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">تعديل</button><button className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">{b.status==='ACTIVE'?'إيقاف':'تفعيل'}</button></div>
          </div>
          <div className="mt-3 flex items-center gap-6 text-sm text-gray-500">
            <span>المشغّل: <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">{b.trigger}</code></span>
            <span>النوع: {b.type}</span>
            {b.triggered>0&&<><span>تم التشغيل: {b.triggered}</span><span>مكتمل: {b.completed}</span></>}
          </div>
        </div>))}</div>
    </div>
  );
}
