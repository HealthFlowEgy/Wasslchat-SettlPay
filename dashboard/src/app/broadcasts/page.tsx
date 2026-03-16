'use client';
import React, { useState, useEffect } from 'react';
import api from '../../lib/api';
import { useToast } from '../../lib/toast';

const statusC: Record<string, string> = { DRAFT: 'bg-gray-100 text-gray-600', SENDING: 'bg-blue-100 text-blue-700', COMPLETED: 'bg-green-100 text-green-700', SCHEDULED: 'bg-purple-100 text-purple-700', FAILED: 'bg-red-100 text-red-700', CANCELLED: 'bg-gray-100 text-gray-500' };
const statusAr: Record<string, string> = { DRAFT: 'مسودة', SENDING: 'جارٍ الإرسال', COMPLETED: 'مكتملة', SCHEDULED: 'مجدولة', FAILED: 'فشلت', CANCELLED: 'ملغية' };

export default function BroadcastsPage() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchData = async () => {
    try {
      const res = await api.getBroadcasts();
      setCampaigns(res.data || []);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const send = async (id: string) => {
    if (!confirm('هل تريد إرسال هذه الحملة الآن؟')) return;
    try {
      await api.sendBroadcast(id);
      toast('تم بدء إرسال الحملة', 'success');
      fetchData();
    } catch (err: any) { toast(err.message, 'error'); }
  };

  const duplicate = async (id: string) => {
    try {
      await api.post(`/broadcasts/${id}/duplicate`);
      toast('تم نسخ الحملة', 'success');
      fetchData();
    } catch (err: any) { toast(err.message, 'error'); }
  };

  if (loading) return <div className="flex items-center justify-center min-h-[400px]"><div className="h-8 w-8 border-3 border-green-500 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between"><h1 className="text-2xl font-bold text-gray-900">الحملات</h1><button className="px-4 py-2 rounded-lg bg-green-500 hover:bg-green-600 text-white text-sm font-medium">+ حملة جديدة</button></div>
      {campaigns.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-200"><div className="text-4xl mb-3">📢</div><p className="text-gray-500">لا توجد حملات بعد</p></div>
      ) : (
        <div className="grid gap-4">{campaigns.map((c: any) => (
          <div key={c.id} className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <h3 className="font-semibold text-gray-900">{c.name}</h3>
                <span className={`inline-flex px-2 py-0.5 rounded-md text-xs font-medium ${statusC[c.status] || ''}`}>{statusAr[c.status] || c.status}</span>
              </div>
              <div className="flex gap-2">
                {c.status === 'DRAFT' && <button onClick={() => send(c.id)} className="px-3 py-1.5 rounded-lg bg-green-500 text-white text-sm hover:bg-green-600">إرسال</button>}
                <button onClick={() => duplicate(c.id)} className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">نسخ</button>
              </div>
            </div>
            {(c.status === 'COMPLETED' || c.status === 'SENDING') && (
              <div className="grid grid-cols-4 gap-4 text-center">
                {[{ l: 'مُرسل', v: c.sentCount }, { l: 'تم التسليم', v: c.deliveredCount }, { l: 'مقروء', v: c.readCount }, { l: 'فشل', v: c.failedCount }].map((s, i) => (
                  <div key={i}><p className="text-lg font-bold text-gray-900">{(s.v || 0).toLocaleString()}</p><p className="text-xs text-gray-500">{s.l}</p></div>
                ))}
              </div>
            )}
            {c.scheduledAt && c.status === 'SCHEDULED' && <p className="text-sm text-purple-600 mt-2">مجدولة: {new Date(c.scheduledAt).toLocaleString('ar-EG')}</p>}
          </div>
        ))}</div>
      )}
    </div>
  );
}
