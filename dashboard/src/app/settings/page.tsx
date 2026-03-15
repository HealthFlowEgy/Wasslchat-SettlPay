'use client';
import React, { useState } from 'react';

export default function SettingsPage() {
  const [tab, setTab] = useState('store');
  const tabs = [{id:'store',label:'المتجر'},{id:'whatsapp',label:'واتساب'},{id:'payments',label:'المدفوعات'},{id:'shipping',label:'الشحن'},{id:'team',label:'الفريق'},{id:'billing',label:'الاشتراك'}];

  return (
    <div className="p-6 space-y-6" dir="rtl">
      <h1 className="text-2xl font-bold text-gray-900">الإعدادات</h1>
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1">{tabs.map(t=>(<button key={t.id} onClick={()=>setTab(t.id)} className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${tab===t.id?'bg-white text-gray-900 shadow-sm':'text-gray-500 hover:text-gray-700'}`}>{t.label}</button>))}</div>
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-6">
        {tab==='store'&&(<><h2 className="font-semibold text-gray-900">معلومات المتجر</h2>
          <div className="grid grid-cols-2 gap-4">{[{l:'اسم المتجر',v:'متجر تجريبي'},{l:'Store Name (EN)',v:'Demo Store'},{l:'البريد',v:'demo@wasslchat.com'},{l:'الهاتف',v:'01012345678'},{l:'المدينة',v:'القاهرة'},{l:'المحافظة',v:'القاهرة'}].map((f,i)=>(<div key={i}><label className="block text-sm text-gray-600 mb-1">{f.l}</label><input defaultValue={f.v} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-green-500"/></div>))}</div>
          <button className="px-6 py-2 rounded-lg bg-green-500 text-white text-sm font-medium">حفظ</button></>)}
        {tab==='whatsapp'&&(<><h2 className="font-semibold text-gray-900">اتصال واتساب</h2><div className="flex items-center gap-4 p-4 rounded-xl border border-gray-200"><div className="h-12 w-12 rounded-xl bg-green-100 flex items-center justify-center text-green-600 text-xl font-bold">W</div><div><p className="text-sm font-medium text-gray-900">الحالة: <span className="text-green-600">متصل ✓</span></p><p className="text-xs text-gray-400">+20 10 1234 5678</p></div><button className="mr-auto px-3 py-1.5 rounded-lg border border-red-200 text-red-600 text-sm">قطع الاتصال</button></div></>)}
        {tab==='payments'&&(<><h2 className="font-semibold text-gray-900">بوابات الدفع</h2>{['HealthPay','Fawry','Vodafone Cash','الدفع عند الاستلام (COD)'].map((g,i)=>(<div key={i} className="flex items-center justify-between p-4 rounded-xl border border-gray-200"><span className="text-sm font-medium text-gray-900">{g}</span><button className="relative w-11 h-6 rounded-full bg-green-500"><span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-sm"/></button></div>))}</>)}
        {tab==='shipping'&&(<><h2 className="font-semibold text-gray-900">مقدمي الشحن</h2>{[{n:'WasslBox',d:'توصيل نفس اليوم'},{n:'Bosta',d:'توصيل كل المحافظات'}].map((s,i)=>(<div key={i} className="flex items-center justify-between p-4 rounded-xl border border-gray-200"><div><p className="text-sm font-medium text-gray-900">{s.n}</p><p className="text-xs text-gray-400">{s.d}</p></div><button className="px-3 py-1.5 rounded-lg bg-green-50 text-green-700 text-sm font-medium">تفعيل</button></div>))}</>)}
        {tab==='team'&&(<><h2 className="font-semibold text-gray-900">أعضاء الفريق</h2>{[{n:'أحمد (أنت)',r:'Owner',active:true},{n:'سارة',r:'Admin',active:true},{n:'محمد',r:'Agent',active:false}].map((m,i)=>(<div key={i} className="flex items-center justify-between p-3 rounded-xl border border-gray-200"><div className="flex items-center gap-3"><div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center text-sm font-bold text-gray-600">{m.n[0]}</div><div><p className="text-sm font-medium text-gray-900">{m.n}</p><p className="text-xs text-gray-400">{m.r}</p></div></div><span className={`text-xs ${m.active?'text-green-600':'text-gray-400'}`}>{m.active?'نشط':'غير نشط'}</span></div>))}<button className="px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-600">+ إضافة عضو</button></>)}
        {tab==='billing'&&(<><h2 className="font-semibold text-gray-900">الاشتراك الحالي</h2><div className="p-4 rounded-xl bg-green-50 border border-green-200"><div className="flex justify-between"><div><p className="text-lg font-bold text-green-800">خطة Growth</p><p className="text-sm text-green-600">999 ج.م / شهر</p></div><button className="px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-medium">ترقية</button></div><div className="mt-3 grid grid-cols-3 gap-4 text-sm">{[{l:'محادثات',v:'450 / 2,000'},{l:'فريق',v:'3 / 5'},{l:'منتجات',v:'5 / 500'}].map((u,i)=>(<div key={i}><p className="text-green-600">{u.l}</p><p className="font-medium text-green-800">{u.v}</p></div>))}</div></div></>)}
      </div>
    </div>
  );
}
