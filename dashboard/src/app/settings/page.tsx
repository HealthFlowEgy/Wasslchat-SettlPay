'use client';
import React, { useState, useEffect } from 'react';
import api from '../../lib/api';

type Tab = 'store' | 'whatsapp' | 'payments' | 'shipping' | 'team' | 'billing';
const tabs: { id: Tab; label: string }[] = [
  { id: 'store', label: 'المتجر' }, { id: 'whatsapp', label: 'واتساب' },
  { id: 'payments', label: 'المدفوعات' }, { id: 'shipping', label: 'الشحن' },
  { id: 'team', label: 'الفريق' }, { id: 'billing', label: 'الاشتراك' },
];

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>('store');
  const [tenant, setTenant] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [whatsappStatus, setWhatsappStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  // Form state
  const [form, setForm] = useState({ name: '', nameAr: '', email: '', phone: '', city: '', governorate: '', businessType: '', description: '' });

  useEffect(() => {
    Promise.all([
      api.getTenant().catch(() => null),
      api.get('/users').catch(() => ({ data: [] })),
      api.getWhatsappStatus().catch(() => null),
    ]).then(([t, u, ws]) => {
      const data = t?.data || t;
      setTenant(data);
      if (data) setForm({ name: data.name || '', nameAr: data.nameAr || '', email: data.email || '', phone: data.phone || '', city: data.city || '', governorate: data.governorate || '', businessType: data.businessType || '', description: data.description || '' });
      setUsers(u?.data || []);
      setWhatsappStatus(ws?.data || ws);
      setLoading(false);
    });
  }, []);

  const saveStore = async () => {
    setSaving(true); setMsg('');
    try {
      await api.patch('/tenant', form);
      setMsg('تم الحفظ بنجاح ✅');
    } catch (err: any) { setMsg(`خطأ: ${err.message}`); }
    setSaving(false);
  };

  if (loading) return <div className="flex items-center justify-center min-h-[400px]"><div className="h-8 w-8 border-3 border-green-500 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">الإعدادات</h1>
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 overflow-x-auto">
        {tabs.map(t => (<button key={t.id} onClick={() => setTab(t.id)} className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap px-3 ${tab === t.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>{t.label}</button>))}
      </div>

      {msg && <div className={`p-3 rounded-lg text-sm ${msg.includes('خطأ') ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>{msg}</div>}

      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-6">
        {/* STORE TAB */}
        {tab === 'store' && (<>
          <h2 className="font-semibold text-gray-900">معلومات المتجر</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { key: 'name', label: 'اسم المتجر (EN)', dir: 'ltr' },
              { key: 'nameAr', label: 'اسم المتجر (عربي)' },
              { key: 'email', label: 'البريد الإلكتروني', dir: 'ltr' },
              { key: 'phone', label: 'رقم الهاتف', dir: 'ltr' },
              { key: 'city', label: 'المدينة' },
              { key: 'governorate', label: 'المحافظة' },
              { key: 'businessType', label: 'نوع النشاط' },
            ].map(f => (
              <div key={f.key}>
                <label className="block text-sm text-gray-600 mb-1">{f.label}</label>
                <input value={(form as any)[f.key]} onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))} dir={f.dir || 'rtl'} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-green-500" />
              </div>
            ))}
          </div>
          <div><label className="block text-sm text-gray-600 mb-1">وصف المتجر</label>
            <textarea value={form.description} onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))} rows={3} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-green-500" />
          </div>
          <button onClick={saveStore} disabled={saving} className="px-6 py-2 rounded-lg bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white text-sm font-medium">{saving ? 'جارٍ الحفظ...' : 'حفظ التغييرات'}</button>
        </>)}

        {/* WHATSAPP TAB */}
        {tab === 'whatsapp' && (<>
          <h2 className="font-semibold text-gray-900">اتصال واتساب</h2>
          <div className={`flex items-center gap-4 p-4 rounded-xl border ${whatsappStatus?.status === 'open' ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'}`}>
            <div className={`h-12 w-12 rounded-xl flex items-center justify-center text-xl font-bold text-white ${whatsappStatus?.status === 'open' ? 'bg-green-500' : 'bg-gray-300'}`}>W</div>
            <div>
              <p className="text-sm font-medium text-gray-900">الحالة: <span className={whatsappStatus?.status === 'open' ? 'text-green-600' : 'text-red-500'}>{whatsappStatus?.status === 'open' ? 'متصل ✓' : 'غير متصل'}</span></p>
              {whatsappStatus?.phone && <p className="text-xs text-gray-400" dir="ltr">{whatsappStatus.phone}</p>}
            </div>
            <a href="/whatsapp" className="mr-auto px-4 py-2 rounded-lg bg-green-500 text-white text-sm font-medium hover:bg-green-600">
              {whatsappStatus?.status === 'open' ? 'إدارة الاتصال' : 'اتصال الآن'}
            </a>
          </div>
        </>)}

        {/* PAYMENTS TAB */}
        {tab === 'payments' && (<>
          <h2 className="font-semibold text-gray-900">بوابات الدفع</h2>
          <p className="text-sm text-gray-500">فعّل بوابات الدفع التي تريد قبولها من العملاء</p>
          {[
            { name: 'HealthPay', desc: 'محفظة رقمية + بطاقات بنكية', icon: '💳', envKey: 'HEALTHPAY_API_KEY' },
            { name: 'Fawry', desc: 'الدفع في ٢٠٠+ ألف نقطة بيع', icon: '🏪', envKey: 'FAWRY_MERCHANT_CODE' },
            { name: 'Vodafone Cash', desc: 'محفظة فودافون كاش — ١٥ مليون مستخدم', icon: '📱', envKey: 'VODAFONE_CASH_API_URL' },
            { name: 'الدفع عند الاستلام (COD)', desc: 'كاش عند التسليم', icon: '💵', envKey: null },
          ].map((g, i) => (
            <div key={i} className="flex items-center justify-between p-4 rounded-xl border border-gray-200">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{g.icon}</span>
                <div><p className="text-sm font-medium text-gray-900">{g.name}</p><p className="text-xs text-gray-400">{g.desc}</p></div>
              </div>
              <div className="flex items-center gap-3">
                {g.envKey && <span className="text-xs text-gray-400">يتطلب API Key</span>}
                <div className="w-11 h-6 rounded-full bg-green-500 relative cursor-pointer"><span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform" /></div>
              </div>
            </div>
          ))}
        </>)}

        {/* SHIPPING TAB */}
        {tab === 'shipping' && (<>
          <h2 className="font-semibold text-gray-900">مقدمي الشحن</h2>
          {[
            { name: 'WasslBox', desc: 'توصيل نفس اليوم — القاهرة والجيزة', icon: '📦', status: 'متوفر' },
            { name: 'Bosta', desc: 'توصيل كل المحافظات — ٢-٣ أيام عمل', icon: '🚚', status: 'متوفر' },
          ].map((s, i) => (
            <div key={i} className="flex items-center justify-between p-4 rounded-xl border border-gray-200">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{s.icon}</span>
                <div><p className="text-sm font-medium text-gray-900">{s.name}</p><p className="text-xs text-gray-400">{s.desc}</p></div>
              </div>
              <button className="px-3 py-1.5 rounded-lg bg-green-50 text-green-700 text-sm font-medium hover:bg-green-100">تفعيل</button>
            </div>
          ))}
        </>)}

        {/* TEAM TAB */}
        {tab === 'team' && (<>
          <div className="flex items-center justify-between"><h2 className="font-semibold text-gray-900">أعضاء الفريق</h2><button className="px-4 py-2 rounded-lg bg-green-500 text-white text-sm font-medium hover:bg-green-600">+ إضافة عضو</button></div>
          {users.length === 0 ? <p className="text-sm text-gray-400">لا يوجد أعضاء</p> : (
            <div className="space-y-2">{users.map((u: any, i: number) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-xl border border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-gray-200 flex items-center justify-center text-sm font-bold text-gray-600">{(u.firstName || '?')[0]}</div>
                  <div><p className="text-sm font-medium text-gray-900">{u.firstName} {u.lastName}</p><p className="text-xs text-gray-400">{u.email} · {u.role}</p></div>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-md ${u.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{u.isActive ? 'نشط' : 'غير نشط'}</span>
              </div>
            ))}</div>
          )}
        </>)}

        {/* BILLING TAB */}
        {tab === 'billing' && (<>
          <h2 className="font-semibold text-gray-900">الاشتراك الحالي</h2>
          {tenant?.plan ? (
            <div className="p-5 rounded-xl bg-green-50 border border-green-200">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-lg font-bold text-green-800">خطة {tenant.plan.nameAr || tenant.plan.name}</p>
                  <p className="text-sm text-green-600 mt-0.5">{tenant.plan.priceMonthly > 0 ? `${tenant.plan.priceMonthly} ج.م / شهر` : 'مخصص'}</p>
                  {tenant.status === 'TRIAL' && tenant.trialEndsAt && (
                    <p className="text-xs text-amber-600 mt-2">الفترة التجريبية تنتهي: {new Date(tenant.trialEndsAt).toLocaleDateString('ar-EG')}</p>
                  )}
                </div>
                <button className="px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700">ترقية الخطة</button>
              </div>
              <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                {[
                  { l: 'المحادثات', v: tenant.plan.maxConversations === -1 ? 'غير محدود' : tenant.plan.maxConversations },
                  { l: 'أعضاء الفريق', v: tenant.plan.maxTeamMembers === -1 ? 'غير محدود' : tenant.plan.maxTeamMembers },
                  { l: 'المنتجات', v: tenant.plan.maxProducts === -1 ? 'غير محدود' : tenant.plan.maxProducts },
                  { l: 'الحملات/شهر', v: tenant.plan.maxBroadcastsPerMonth === -1 ? 'غير محدود' : tenant.plan.maxBroadcastsPerMonth },
                ].map((u, i) => (
                  <div key={i}><p className="text-green-600">{u.l}</p><p className="font-semibold text-green-800">{u.v}</p></div>
                ))}
              </div>
            </div>
          ) : <p className="text-sm text-gray-400">لا يوجد اشتراك</p>}
        </>)}
      </div>
    </div>
  );
}
