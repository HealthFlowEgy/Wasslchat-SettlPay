'use client';
import React from 'react';

const stats = [
  { label:'إيرادات اليوم', value:'٨,٤٢٠ ج.م', change:'+18%', color:'text-green-600' },
  { label:'طلبات اليوم', value:'٤٧', change:'+12%', color:'text-green-600' },
  { label:'عملاء جدد', value:'١٢', change:'+5%', color:'text-green-600' },
  { label:'محادثات مفتوحة', value:'٢٣', change:'-8%', color:'text-red-500' },
  { label:'معدل التحويل', value:'٣.٢%', change:'+0.5%', color:'text-green-600' },
  { label:'متوسط قيمة الطلب', value:'٣٥٠ ج.م', change:'+15%', color:'text-green-600' },
];

const topProducts = [
  { name:'سماعات لاسلكية', sold:45, revenue:'٢٠,٢٥٠ ج.م' },
  { name:'تي شيرت قطن', sold:38, revenue:'٦,٨٤٠ ج.م' },
  { name:'ساعة ذكية', sold:22, revenue:'٢٦,٤٠٠ ج.م' },
  { name:'سيروم فيتامين سي', sold:18, revenue:'٤,٥٠٠ ج.م' },
  { name:'كريم وجه', sold:15, revenue:'١,٤٢٥ ج.م' },
];

export default function AnalyticsPage() {
  return (
    <div className="p-6 space-y-6" dir="rtl">
      <h1 className="text-2xl font-bold text-gray-900">التحليلات</h1>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {stats.map((s,i)=>(<div key={i} className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm"><p className="text-sm text-gray-500">{s.label}</p><p className="text-2xl font-bold text-gray-900 mt-1">{s.value}</p><p className={`text-sm font-medium mt-1 ${s.color}`}>{s.change}</p></div>))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-4">أكثر المنتجات مبيعاً</h3>
          <div className="space-y-3">{topProducts.map((p,i)=>(<div key={i} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0"><div className="flex items-center gap-3"><span className="text-sm font-bold text-gray-400 w-5">{i+1}</span><span className="text-sm text-gray-900">{p.name}</span></div><div className="text-left"><p className="text-sm font-medium text-gray-900">{p.revenue}</p><p className="text-xs text-gray-400">{p.sold} قطعة</p></div></div>))}</div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-4">توزيع طرق الدفع</h3>
          <div className="space-y-3">{[{m:'فوري',pct:42},{m:'HealthPay',pct:28},{m:'الدفع عند الاستلام',pct:20},{m:'فودافون كاش',pct:10}].map((p,i)=>(<div key={i}><div className="flex justify-between text-sm mb-1"><span className="text-gray-600">{p.m}</span><span className="font-medium text-gray-900">{p.pct}%</span></div><div className="h-2 bg-gray-100 rounded-full"><div className="h-2 bg-green-500 rounded-full" style={{width:`${p.pct}%`}}/></div></div>))}</div>
        </div>
      </div>
    </div>
  );
}
