'use client';
import React, { useState, useEffect } from 'react';
import api from '../../lib/api';
import { useToast } from '../../lib/toast';

const statusC: Record<string, string> = { ACTIVE: 'bg-green-100 text-green-700', INACTIVE: 'bg-gray-100 text-gray-600', DRAFT: 'bg-amber-100 text-amber-700' };
const statusAr: Record<string, string> = { ACTIVE: 'نشط', INACTIVE: 'معطّل', DRAFT: 'مسودة' };

export default function ChatbotsPage() {
  const [bots, setBots] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetch = async () => {
    try {
      const res = await api.get('/chatbots');
      setBots(res.data || []);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { fetch(); }, []);

  const toggle = async (id: string) => {
    try {
      await api.patch(`/chatbots/${id}/toggle`);
      toast('تم تحديث حالة البوت', 'success');
      fetch();
    } catch (err: any) { toast(err.message, 'error'); }
  };

  const remove = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا البوت؟')) return;
    try {
      await api.del(`/chatbots/${id}`);
      toast('تم حذف البوت', 'success');
      fetch();
    } catch (err: any) { toast(err.message, 'error'); }
  };

  if (loading) return <div className="flex items-center justify-center min-h-[400px]"><div className="h-8 w-8 border-3 border-green-500 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between"><h1 className="text-2xl font-bold text-gray-900">البوتات</h1><button className="px-4 py-2 rounded-lg bg-green-500 hover:bg-green-600 text-white text-sm font-medium">+ بوت جديد</button></div>
      {bots.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-200"><div className="text-4xl mb-3">🤖</div><p className="text-gray-500">لا توجد بوتات بعد</p><p className="text-sm text-gray-400 mt-1">أنشئ بوت لأتمتة الردود على العملاء</p></div>
      ) : (
        <div className="grid gap-4">{bots.map((b: any) => (
          <div key={b.id} className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h3 className="font-semibold text-gray-900">{b.nameAr || b.name}</h3>
                <span className={`inline-flex px-2 py-0.5 rounded-md text-xs font-medium ${statusC[b.status] || 'bg-gray-100'}`}>{statusAr[b.status] || b.status}</span>
              </div>
              <div className="flex gap-2">
                <button onClick={() => toggle(b.id)} className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">{b.status === 'ACTIVE' ? 'إيقاف' : 'تفعيل'}</button>
                <button onClick={() => remove(b.id)} className="px-3 py-1.5 rounded-lg border border-red-200 text-sm text-red-600 hover:bg-red-50">حذف</button>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-6 text-sm text-gray-500">
              <span>المشغّل: <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">{b.trigger}</code></span>
              <span>النوع: {b.triggerType || 'keyword'}</span>
              {b.stats?.triggered > 0 && <span>تشغيل: {b.stats.triggered}</span>}
            </div>
          </div>
        ))}</div>
      )}
    </div>
  );
}
