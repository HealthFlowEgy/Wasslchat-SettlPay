'use client';
import React, { useState, useEffect } from 'react';
import api from '../../lib/api';
import { useToast } from '../../lib/toast';

const eventLabels: Record<string, string> = {
  'contact.created': 'عميل جديد', 'product.low_stock': 'مخزون منخفض', 'order.created': 'طلب جديد',
  'order.delivered': 'طلب تم تسليمه', 'order.confirmed': 'طلب مؤكد', 'order.cancelled': 'طلب ملغي',
  'message.inbound': 'رسالة واردة', 'payment.completed': 'دفعة مكتملة',
};

export default function AutomationPage() {
  const [rules, setRules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchData = async () => {
    try {
      const res = await api.get('/automation');
      setRules(res.data || []);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const toggle = async (id: string) => {
    try {
      await api.patch(`/automation/${id}/toggle`);
      toast('تم تحديث حالة القاعدة', 'success');
      fetchData();
    } catch (err: any) { toast(err.message, 'error'); }
  };

  const remove = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذه القاعدة؟')) return;
    try {
      await api.del(`/automation/${id}`);
      toast('تم حذف القاعدة', 'success');
      fetchData();
    } catch (err: any) { toast(err.message, 'error'); }
  };

  if (loading) return <div className="flex items-center justify-center min-h-[400px]"><div className="h-8 w-8 border-3 border-green-500 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-gray-900">الأتمتة</h1><p className="text-sm text-gray-500">{rules.length} قاعدة</p></div>
        <button className="px-4 py-2 rounded-lg bg-green-500 hover:bg-green-600 text-white text-sm font-medium">+ قاعدة جديدة</button>
      </div>
      {rules.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-200"><div className="text-4xl mb-3">⚡</div><p className="text-gray-500">لا توجد قواعد أتمتة بعد</p><p className="text-sm text-gray-400 mt-1">أنشئ قاعدة لأتمتة المهام المتكررة</p></div>
      ) : (
        <div className="grid gap-4">{rules.map((r: any) => {
          const conditions = Array.isArray(r.conditions) ? r.conditions : [];
          const actions = Array.isArray(r.actions) ? r.actions : [];
          return (
            <div key={r.id} className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`h-3 w-3 rounded-full ${r.isActive ? 'bg-green-500' : 'bg-gray-300'}`} />
                  <h3 className="font-semibold text-gray-900">{r.name}</h3>
                  <span className="inline-flex px-2 py-0.5 rounded-md text-xs font-medium bg-purple-100 text-purple-700">{eventLabels[r.event] || r.event}</span>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => toggle(r.id)} className={`px-3 py-1.5 rounded-lg text-sm font-medium ${r.isActive ? 'border border-red-200 text-red-600 hover:bg-red-50' : 'bg-green-50 text-green-700 hover:bg-green-100'}`}>
                    {r.isActive ? 'إيقاف' : 'تفعيل'}
                  </button>
                  <button onClick={() => remove(r.id)} className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-500 hover:bg-gray-50">حذف</button>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-4 text-sm">
                <div><span className="text-gray-400">الشروط: </span><span className="text-gray-700">{conditions.length > 0 ? conditions.map((c: any) => `${c.field} ${c.operator} ${c.value}`).join('، ') : 'بدون شروط'}</span></div>
                <div><span className="text-gray-400">الإجراءات: </span><span className="text-gray-700">{actions.length > 0 ? actions.map((a: any) => a.type).join('، ') : '-'}</span></div>
                <div><span className="text-gray-400">التنفيذات: </span><span className="font-medium text-gray-900">{r.executionCount || 0}</span></div>
              </div>
            </div>
          );
        })}</div>
      )}
    </div>
  );
}
