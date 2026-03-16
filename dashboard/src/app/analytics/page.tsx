'use client';
import React, { useState, useEffect } from 'react';
import api from '../../lib/api';

export default function AnalyticsPage() {
  const [data, setData] = useState<any>(null);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [period, setPeriod] = useState('month');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.getDashboard(period),
      api.get('/analytics/top-products?limit=5'),
    ]).then(([dashboard, products]) => {
      setData(dashboard.data);
      setTopProducts(products.data || []);
    }).finally(() => setLoading(false));
  }, [period]);

  if (loading) return <div className="flex items-center justify-center min-h-[400px]"><div className="h-8 w-8 border-3 border-green-500 border-t-transparent rounded-full animate-spin" /></div>;

  const stats = [
    { label: 'إيرادات الفترة', value: `${(data?.revenue?.total || 0).toLocaleString()} ج.م`, color: 'text-green-600' },
    { label: 'الطلبات', value: data?.orders?.total || 0, color: 'text-blue-600' },
    { label: 'المكتملة', value: data?.orders?.completed || 0, color: 'text-green-600' },
    { label: 'معدل التحويل', value: `${data?.orders?.conversionRate || 0}%`, color: 'text-purple-600' },
    { label: 'عملاء جدد', value: data?.contacts?.new || 0, color: 'text-amber-600' },
    { label: 'محادثات مفتوحة', value: data?.conversations?.open || 0, color: 'text-red-500' },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">التحليلات</h1>
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {[{ v: 'day', l: 'يوم' }, { v: 'week', l: 'أسبوع' }, { v: 'month', l: 'شهر' }].map(p => (
            <button key={p.v} onClick={() => setPeriod(p.v)} className={`px-3 py-1.5 rounded-md text-sm font-medium ${period === p.v ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>{p.l}</button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {stats.map((s, i) => (<div key={i} className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm"><p className="text-sm text-gray-500">{s.label}</p><p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p></div>))}
      </div>
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
        <h3 className="font-semibold text-gray-900 mb-4">أكثر المنتجات مبيعاً</h3>
        {topProducts.length === 0 ? <p className="text-sm text-gray-400">لا توجد بيانات كافية</p> : (
          <div className="space-y-3">{topProducts.map((p: any, i: number) => (
            <div key={i} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
              <div className="flex items-center gap-3"><span className="text-sm font-bold text-gray-400 w-5">{i + 1}</span><span className="text-sm text-gray-900">{p.product?.nameAr || p.product?.name || '-'}</span></div>
              <div className="text-left"><p className="text-sm font-medium text-gray-900">{(p.totalRevenue || 0).toLocaleString()} ج.م</p><p className="text-xs text-gray-400">{p.totalSold || 0} قطعة</p></div>
            </div>
          ))}</div>
        )}
      </div>
    </div>
  );
}
