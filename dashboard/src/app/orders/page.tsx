'use client';
import React, { useState, useEffect } from 'react';
import api from '../../lib/api';
import { useWsEvent } from '../../lib/websocket';
import { useToast } from '../../lib/toast';

const statusAr: Record<string, string> = { PENDING:'معلّق', CONFIRMED:'مؤكد', PROCESSING:'قيد التجهيز', SHIPPED:'تم الشحن', DELIVERED:'تم التسليم', CANCELLED:'ملغي' };
const statusColors: Record<string, string> = { PENDING:'bg-amber-100 text-amber-700', CONFIRMED:'bg-blue-100 text-blue-700', PROCESSING:'bg-purple-100 text-purple-700', SHIPPED:'bg-indigo-100 text-indigo-700', DELIVERED:'bg-green-100 text-green-700', CANCELLED:'bg-red-100 text-red-700' };

export default function OrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [status, setStatus] = useState('all');
  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState({ total: 0, totalPages: 1 });
  const [page, setPage] = useState(1);
  const { toast } = useToast();

  const fetchOrders = () => {
    setLoading(true);
    const p = new URLSearchParams({ page: String(page), limit: '20' });
    if (status !== 'all') p.set('status', status);
    api.getOrders(p.toString()).then(r => { setOrders(r.data?.data || []); setMeta(r.data?.meta || { total: 0, totalPages: 1 }); }).finally(() => setLoading(false));
  };

  useEffect(() => { fetchOrders(); }, [page, status]);

  useWsEvent('new_order', (order: any) => {
    toast(`طلب جديد #${order.orderNumber || ''} — ${order.total || 0} ج.م`, 'success');
    setOrders(prev => [order, ...prev.slice(0, 19)]);
    setMeta(prev => ({ ...prev, total: prev.total + 1 }));
  });

  useWsEvent('payment_updated', (payment: any) => {
    if (payment.status === 'COMPLETED') { toast('تم استلام دفعة ✅', 'success'); fetchOrders(); }
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between"><div><h1 className="text-2xl font-bold text-gray-900">الطلبات</h1><p className="text-sm text-gray-500">{meta.total} طلب</p></div></div>
      <div className="flex gap-2 flex-wrap">{['all','PENDING','CONFIRMED','PROCESSING','SHIPPED','DELIVERED','CANCELLED'].map(s => (
        <button key={s} onClick={() => { setStatus(s); setPage(1); }} className={`px-3 py-1.5 rounded-lg text-sm font-medium ${status === s ? 'bg-green-500 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>{s === 'all' ? 'الكل' : statusAr[s]}</button>
      ))}</div>
      {loading ? <div className="text-center py-12"><div className="h-8 w-8 border-3 border-green-500 border-t-transparent rounded-full animate-spin mx-auto" /></div> : (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <table className="w-full"><thead><tr className="border-b border-gray-100 bg-gray-50">{['رقم الطلب','العميل','الإجمالي','الدفع','الحالة','التاريخ'].map((h,i) => <th key={i} className="px-4 py-3 text-right text-xs font-medium text-gray-500">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-gray-100">{orders.map((o: any) => (
              <tr key={o.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm font-mono text-gray-900">{o.orderNumber}</td>
                <td className="px-4 py-3"><p className="text-sm font-medium text-gray-900">{o.contact?.name || '-'}</p><p className="text-xs text-gray-400">{o.contact?.phone}</p></td>
                <td className="px-4 py-3 text-sm font-semibold text-gray-900">{o.total} ج.م</td>
                <td className="px-4 py-3 text-xs text-gray-500">{(o.paymentMethod || '-').replace('_',' ')}</td>
                <td className="px-4 py-3"><span className={`inline-flex px-2 py-0.5 rounded-md text-xs font-medium ${statusColors[o.status] || ''}`}>{statusAr[o.status] || o.status}</span></td>
                <td className="px-4 py-3 text-sm text-gray-400">{new Date(o.createdAt).toLocaleDateString('ar-EG')}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
      {meta.totalPages > 1 && <div className="flex items-center justify-between"><span className="text-sm text-gray-500">صفحة {page} من {meta.totalPages}</span><div className="flex gap-2"><button onClick={() => setPage(p => Math.max(1,p-1))} disabled={page===1} className="px-3 py-1.5 rounded-lg border text-sm disabled:opacity-40">السابق</button><button onClick={() => setPage(p => Math.min(meta.totalPages,p+1))} disabled={page===meta.totalPages} className="px-3 py-1.5 rounded-lg border text-sm disabled:opacity-40">التالي</button></div></div>}
    </div>
  );
}
