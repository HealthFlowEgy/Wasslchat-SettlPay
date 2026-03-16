'use client';
import React, { useState, useEffect, useCallback } from 'react';
import api from '../../lib/api';
import { useWsEvent } from '../../lib/websocket';

const statusAr: Record<string, string> = { PENDING: 'معلّق', CONFIRMED: 'مؤكد', PROCESSING: 'قيد التجهيز', SHIPPED: 'تم الشحن', DELIVERED: 'تم التسليم', CANCELLED: 'ملغي' };
const statusColors: Record<string, string> = { PENDING: 'bg-amber-100 text-amber-700', CONFIRMED: 'bg-blue-100 text-blue-700', PROCESSING: 'bg-purple-100 text-purple-700', SHIPPED: 'bg-indigo-100 text-indigo-700', DELIVERED: 'bg-green-100 text-green-700', CANCELLED: 'bg-red-100 text-red-700' };

export default function OrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [status, setStatus] = useState('all');
  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState({ total: 0, totalPages: 1 });
  const [page, setPage] = useState(1);
  const [flash, setFlash] = useState<string | null>(null);

  const fetchOrders = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: '20' });
    if (status !== 'all') params.set('status', status);
    api.getOrders(params.toString()).then(res => {
      setOrders(res.data?.data || []);
      setMeta(res.data?.meta || { total: 0, totalPages: 1 });
    }).finally(() => setLoading(false));
  }, [page, status]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  // Real-time: listen for new orders via WebSocket
  const handleNewOrder = useCallback((data: any) => {
    const order = data?.order || data;
    // Show flash notification
    setFlash(`طلب جديد #${order.orderNumber || order.id?.slice(-6)}`);
    setTimeout(() => setFlash(null), 4000);
    // Prepend new order to the list if on first page
    if (page === 1) {
      setOrders(prev => {
        if (prev.some(o => o.id === order.id)) return prev;
        return [order, ...prev.slice(0, 19)]; // Keep max 20
      });
      setMeta(prev => ({ ...prev, total: prev.total + 1 }));
    }
  }, [page]);

  // Real-time: listen for order status updates
  const handleOrderUpdated = useCallback((data: any) => {
    const updated = data?.order || data;
    setOrders(prev => prev.map(o => o.id === updated.id ? { ...o, ...updated } : o));
  }, []);

  // Real-time: listen for payment completions (update payment status)
  const handlePaymentCompleted = useCallback((data: any) => {
    const orderId = data?.orderId || data?.order?.id;
    if (orderId) {
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, paymentStatus: 'COMPLETED', status: data?.order?.status || o.status } : o));
    }
  }, []);

  useWsEvent('order.created', handleNewOrder);
  useWsEvent('order.updated', handleOrderUpdated);
  useWsEvent('payment.completed', handlePaymentCompleted);

  return (
    <div className="p-6 space-y-6">
      {/* Flash notification for new orders */}
      {flash && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-green-500 text-white px-6 py-3 rounded-xl shadow-lg animate-bounce text-sm font-medium">
          {flash}
        </div>
      )}
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-gray-900">الطلبات</h1><p className="text-sm text-gray-500">{meta.total} طلب</p></div>
      </div>
      <div className="flex gap-2 flex-wrap">
        {['all', 'PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'].map(s => (
          <button key={s} onClick={() => { setStatus(s); setPage(1); }} className={`px-3 py-1.5 rounded-lg text-sm font-medium ${status === s ? 'bg-green-500 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>{s === 'all' ? 'الكل' : statusAr[s]}</button>
        ))}
      </div>
      {loading ? <div className="text-center py-12"><div className="h-8 w-8 border-3 border-green-500 border-t-transparent rounded-full animate-spin mx-auto" /></div> : (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <table className="w-full"><thead><tr className="border-b border-gray-100 bg-gray-50">{['رقم الطلب', 'العميل', 'الإجمالي', 'الدفع', 'الحالة', 'التاريخ'].map((h, i) => <th key={i} className="px-4 py-3 text-right text-xs font-medium text-gray-500">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-gray-100">{orders.map((o: any) => (
              <tr key={o.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm font-mono text-gray-900">{o.orderNumber}</td>
                <td className="px-4 py-3"><p className="text-sm font-medium text-gray-900">{o.contact?.name || '-'}</p><p className="text-xs text-gray-400">{o.contact?.phone}</p></td>
                <td className="px-4 py-3 text-sm font-semibold text-gray-900">{o.total} ج.م</td>
                <td className="px-4 py-3 text-xs text-gray-500">{(o.paymentMethod || '-').replace('_', ' ')}</td>
                <td className="px-4 py-3"><span className={`inline-flex px-2 py-0.5 rounded-md text-xs font-medium ${statusColors[o.status] || ''}`}>{statusAr[o.status] || o.status}</span></td>
                <td className="px-4 py-3 text-sm text-gray-400">{new Date(o.createdAt).toLocaleDateString('ar-EG')}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
      {meta.totalPages > 1 && <div className="flex items-center justify-between"><span className="text-sm text-gray-500">صفحة {page} من {meta.totalPages}</span><div className="flex gap-2"><button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1.5 rounded-lg border text-sm disabled:opacity-40">السابق</button><button onClick={() => setPage(p => Math.min(meta.totalPages, p + 1))} disabled={page === meta.totalPages} className="px-3 py-1.5 rounded-lg border text-sm disabled:opacity-40">التالي</button></div></div>}
    </div>
  );
}
