'use client';
import React, { useState } from 'react';

const mockContacts = [
  { id:'1', name:'أحمد محمد', phone:'01012345678', email:'ahmed@test.com', orders:5, spent:3200, lastContact:'منذ ٥ دقائق', source:'WHATSAPP', tags:['VIP'] },
  { id:'2', name:'سارة أحمد', phone:'01123456789', email:'sara@test.com', orders:3, spent:1580, lastContact:'منذ ساعة', source:'WHATSAPP', tags:['عميل متكرر'] },
  { id:'3', name:'محمد علي', phone:'01234567890', email:null, orders:1, spent:275, lastContact:'أمس', source:'MANUAL', tags:[] },
  { id:'4', name:'فاطمة حسن', phone:'01098765432', email:'fatma@test.com', orders:8, spent:5400, lastContact:'منذ ٣ أيام', source:'WHATSAPP', tags:['VIP','عميل متكرر'] },
];

export default function ContactsPage() {
  const [search, setSearch] = useState('');
  const filtered = mockContacts.filter(c => !search || c.name.includes(search) || c.phone.includes(search));

  return (
    <div className="p-6 space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-gray-900">العملاء</h1><p className="text-sm text-gray-500">{filtered.length} عميل</p></div>
        <div className="flex gap-2">
          <button className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50">استيراد CSV</button>
          <button className="px-4 py-2 rounded-lg bg-green-500 hover:bg-green-600 text-white text-sm font-medium">+ إضافة عميل</button>
        </div>
      </div>
      <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="بحث بالاسم أو رقم الهاتف..." className="w-full max-w-md rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-green-500" />
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full"><thead><tr className="border-b border-gray-100 bg-gray-50">{['العميل','الهاتف','الطلبات','إجمالي الإنفاق','التاجات','آخر تواصل','المصدر'].map((h,i)=><th key={i} className="px-4 py-3 text-right text-xs font-medium text-gray-500">{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-gray-100">{filtered.map(c=>(
            <tr key={c.id} className="hover:bg-gray-50 cursor-pointer">
              <td className="px-4 py-3"><p className="text-sm font-medium text-gray-900">{c.name}</p>{c.email&&<p className="text-xs text-gray-400">{c.email}</p>}</td>
              <td className="px-4 py-3 text-sm text-gray-600 font-mono" dir="ltr">{c.phone}</td>
              <td className="px-4 py-3 text-sm text-gray-900">{c.orders}</td>
              <td className="px-4 py-3 text-sm font-medium text-gray-900">{c.spent.toLocaleString()} ج.م</td>
              <td className="px-4 py-3"><div className="flex gap-1">{c.tags.map((t,i)=>(<span key={i} className="inline-flex px-2 py-0.5 rounded-md text-xs font-medium bg-indigo-100 text-indigo-700">{t}</span>))}</div></td>
              <td className="px-4 py-3 text-sm text-gray-400">{c.lastContact}</td>
              <td className="px-4 py-3"><span className="inline-flex px-2 py-0.5 rounded-md text-xs bg-green-100 text-green-700">{c.source}</span></td>
            </tr>))}</tbody>
        </table>
      </div>
    </div>
  );
}
