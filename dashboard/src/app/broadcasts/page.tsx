'use client';
import React from 'react';

const statusC: Record<string,string> = { DRAFT:'bg-gray-100 text-gray-600', SENDING:'bg-blue-100 text-blue-700', COMPLETED:'bg-green-100 text-green-700', SCHEDULED:'bg-purple-100 text-purple-700' };
const statusAr: Record<string,string> = { DRAFT:'مسودة', SENDING:'جارٍ الإرسال', COMPLETED:'مكتملة', SCHEDULED:'مجدولة' };

const campaigns = [
  { id:'1', name:'عروض رمضان 🌙', status:'COMPLETED', sent:1250, delivered:1180, read:890, failed:70, date:'أمس' },
  { id:'2', name:'تخفيضات نهاية الموسم', status:'SENDING', sent:450, delivered:320, read:0, failed:12, date:'الآن' },
  { id:'3', name:'منتجات جديدة', status:'SCHEDULED', sent:0, delivered:0, read:0, failed:0, date:'غداً ١٠ صباحاً' },
  { id:'4', name:'عيد الأضحى', status:'DRAFT', sent:0, delivered:0, read:0, failed:0, date:'-' },
];

export default function BroadcastsPage() {
  return (
    <div className="p-6 space-y-6" dir="rtl">
      <div className="flex items-center justify-between"><h1 className="text-2xl font-bold text-gray-900">الحملات</h1><button className="px-4 py-2 rounded-lg bg-green-500 hover:bg-green-600 text-white text-sm font-medium">+ حملة جديدة</button></div>
      <div className="grid gap-4">{campaigns.map(c=>(
        <div key={c.id} className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3"><div className="flex items-center gap-3"><h3 className="font-semibold text-gray-900">{c.name}</h3><span className={`inline-flex px-2 py-0.5 rounded-md text-xs font-medium ${statusC[c.status]}`}>{statusAr[c.status]}</span></div><span className="text-sm text-gray-400">{c.date}</span></div>
          {(c.status==='COMPLETED'||c.status==='SENDING')&&<div className="grid grid-cols-4 gap-4">{[{l:'مُرسل',v:c.sent},{l:'تم التسليم',v:c.delivered},{l:'مقروء',v:c.read},{l:'فشل',v:c.failed}].map((s,i)=>(<div key={i} className="text-center"><p className="text-lg font-bold text-gray-900">{s.v.toLocaleString()}</p><p className="text-xs text-gray-500">{s.l}</p></div>))}</div>}
        </div>))}</div>
    </div>
  );
}
