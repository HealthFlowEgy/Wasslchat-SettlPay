'use client';
import React, { useState } from 'react';

const mockProducts = [
  { id:'1', name:'Wireless Earbuds', nameAr:'سماعات لاسلكية', sku:'WE-001', price:450, inventory:50, category:'إلكترونيات', active:true, featured:true },
  { id:'2', name:'Smart Watch', nameAr:'ساعة ذكية', sku:'SW-001', price:1200, inventory:30, category:'إلكترونيات', active:true, featured:false },
  { id:'3', name:'Cotton T-Shirt', nameAr:'تي شيرت قطن', sku:'TS-001', price:180, inventory:100, category:'أزياء', active:true, featured:true },
  { id:'4', name:'Face Cream', nameAr:'كريم وجه', sku:'FC-001', price:95, inventory:3, category:'صحة وجمال', active:true, featured:false },
  { id:'5', name:'Vitamin C Serum', nameAr:'سيروم فيتامين سي', sku:'VC-001', price:250, inventory:40, category:'صحة وجمال', active:true, featured:false },
];

export default function ProductsPage() {
  const [search, setSearch] = useState('');
  const filtered = mockProducts.filter(p => !search || p.nameAr.includes(search) || p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="p-6 space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-gray-900">المنتجات</h1><p className="text-sm text-gray-500">{filtered.length} منتج</p></div>
        <button className="px-4 py-2 rounded-lg bg-green-500 hover:bg-green-600 text-white text-sm font-medium">+ إضافة منتج</button>
      </div>
      <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="بحث بالاسم أو SKU..." className="w-full max-w-md rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-green-500" />
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full">
          <thead><tr className="border-b border-gray-100 bg-gray-50">{['المنتج','SKU','التصنيف','السعر','المخزون','الحالة',''].map((h,i)=><th key={i} className="px-4 py-3 text-right text-xs font-medium text-gray-500">{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-gray-100">{filtered.map(p=>(
            <tr key={p.id} className="hover:bg-gray-50">
              <td className="px-4 py-3"><p className="text-sm font-medium text-gray-900">{p.nameAr}</p><p className="text-xs text-gray-400">{p.name}</p></td>
              <td className="px-4 py-3 text-sm text-gray-600 font-mono">{p.sku}</td>
              <td className="px-4 py-3 text-sm text-gray-600">{p.category}</td>
              <td className="px-4 py-3 text-sm font-medium text-gray-900">{p.price} ج.م</td>
              <td className="px-4 py-3"><span className={`text-sm font-medium ${p.inventory<=5?'text-red-600':p.inventory<=20?'text-amber-600':'text-green-600'}`}>{p.inventory}</span></td>
              <td className="px-4 py-3"><span className={`inline-flex px-2 py-0.5 rounded-md text-xs font-medium ${p.active?'bg-green-100 text-green-700':'bg-gray-100 text-gray-600'}`}>{p.active?'نشط':'معطّل'}</span></td>
              <td className="px-4 py-3"><button className="text-sm text-green-600 hover:underline">تعديل</button></td>
            </tr>))}</tbody>
        </table>
      </div>
    </div>
  );
}
