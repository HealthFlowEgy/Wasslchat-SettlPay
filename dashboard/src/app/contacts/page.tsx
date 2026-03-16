'use client';
import React, { useState, useEffect } from 'react';
import api from '../../lib/api';

export default function ContactsPage() {
  const [contacts, setContacts] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState({ total: 0, totalPages: 1 });
  const [page, setPage] = useState(1);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: '20' });
    if (search) params.set('search', search);
    api.getContacts(params.toString()).then(res => {
      setContacts(res.data?.data || []);
      setMeta(res.data?.meta || { total: 0, totalPages: 1 });
    }).finally(() => setLoading(false));
  }, [page, search]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-gray-900">العملاء</h1><p className="text-sm text-gray-500">{meta.total} عميل</p></div>
        <button className="px-4 py-2 rounded-lg bg-green-500 hover:bg-green-600 text-white text-sm font-medium">+ إضافة عميل</button>
      </div>
      <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="بحث بالاسم أو رقم الهاتف..." className="w-full max-w-md rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-green-500" />
      {loading ? <div className="text-center py-12"><div className="h-8 w-8 border-3 border-green-500 border-t-transparent rounded-full animate-spin mx-auto" /></div> : (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <table className="w-full"><thead><tr className="border-b border-gray-100 bg-gray-50">{['العميل', 'الهاتف', 'الطلبات', 'إجمالي الإنفاق', 'المصدر', 'آخر تواصل'].map((h, i) => <th key={i} className="px-4 py-3 text-right text-xs font-medium text-gray-500">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-gray-100">{contacts.map((c: any) => (
              <tr key={c.id} className="hover:bg-gray-50 cursor-pointer">
                <td className="px-4 py-3"><p className="text-sm font-medium text-gray-900">{c.nameAr || c.name || '-'}</p>{c.email && <p className="text-xs text-gray-400">{c.email}</p>}</td>
                <td className="px-4 py-3 text-sm text-gray-600 font-mono" dir="ltr">{c.phone}</td>
                <td className="px-4 py-3 text-sm text-gray-900">{c.totalOrders || 0}</td>
                <td className="px-4 py-3 text-sm font-medium text-gray-900">{(c.totalSpent || 0).toLocaleString()} ج.م</td>
                <td className="px-4 py-3"><span className="inline-flex px-2 py-0.5 rounded-md text-xs bg-green-100 text-green-700">{c.source}</span></td>
                <td className="px-4 py-3 text-sm text-gray-400">{c.lastContactedAt ? new Date(c.lastContactedAt).toLocaleDateString('ar-EG') : '-'}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
      {meta.totalPages > 1 && <div className="flex items-center justify-between"><span className="text-sm text-gray-500">صفحة {page} من {meta.totalPages}</span><div className="flex gap-2"><button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1.5 rounded-lg border text-sm disabled:opacity-40">السابق</button><button onClick={() => setPage(p => Math.min(meta.totalPages, p + 1))} disabled={page === meta.totalPages} className="px-3 py-1.5 rounded-lg border text-sm disabled:opacity-40">التالي</button></div></div>}
    </div>
  );
}
