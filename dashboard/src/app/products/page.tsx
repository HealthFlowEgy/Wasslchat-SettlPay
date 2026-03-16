'use client';
import React, { useState, useEffect } from 'react';
import api from '../../lib/api';

interface Product { id: string; name: string; nameAr?: string; sku?: string; price: number; inventoryQuantity: number; category?: { name: string }; isActive: boolean; isFeatured: boolean }

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ total: 0, totalPages: 1 });

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (search) params.set('search', search);
      const res = await api.getProducts(params.toString());
      setProducts(res.data?.data || []);
      setMeta(res.data?.meta || { total: 0, totalPages: 1 });
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  useEffect(() => { fetchProducts(); }, [page, search]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-gray-900">المنتجات</h1><p className="text-sm text-gray-500">{meta.total} منتج</p></div>
        <button className="px-4 py-2 rounded-lg bg-green-500 hover:bg-green-600 text-white text-sm font-medium">+ إضافة منتج</button>
      </div>
      <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="بحث بالاسم أو SKU..." className="w-full max-w-md rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-green-500" />
      {loading ? <div className="text-center py-12"><div className="h-8 w-8 border-3 border-green-500 border-t-transparent rounded-full animate-spin mx-auto" /></div> : (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <table className="w-full">
            <thead><tr className="border-b border-gray-100 bg-gray-50">{['المنتج', 'SKU', 'التصنيف', 'السعر', 'المخزون', 'الحالة'].map((h, i) => <th key={i} className="px-4 py-3 text-right text-xs font-medium text-gray-500">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-gray-100">{products.map(p => (
              <tr key={p.id} className="hover:bg-gray-50">
                <td className="px-4 py-3"><p className="text-sm font-medium text-gray-900">{p.nameAr || p.name}</p><p className="text-xs text-gray-400">{p.name}</p></td>
                <td className="px-4 py-3 text-sm text-gray-600 font-mono">{p.sku || '-'}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{p.category?.name || '-'}</td>
                <td className="px-4 py-3 text-sm font-medium text-gray-900">{p.price} ج.م</td>
                <td className="px-4 py-3"><span className={`text-sm font-medium ${p.inventoryQuantity <= 5 ? 'text-red-600' : p.inventoryQuantity <= 20 ? 'text-amber-600' : 'text-green-600'}`}>{p.inventoryQuantity}</span></td>
                <td className="px-4 py-3"><span className={`inline-flex px-2 py-0.5 rounded-md text-xs font-medium ${p.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{p.isActive ? 'نشط' : 'معطّل'}</span></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
      {meta.totalPages > 1 && <div className="flex items-center justify-between"><span className="text-sm text-gray-500">صفحة {page} من {meta.totalPages}</span><div className="flex gap-2"><button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm disabled:opacity-40">السابق</button><button onClick={() => setPage(p => Math.min(meta.totalPages, p + 1))} disabled={page === meta.totalPages} className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm disabled:opacity-40">التالي</button></div></div>}
    </div>
  );
}
