'use client';
import React, { useState, useEffect, useCallback } from 'react';
import api from '../../lib/api';

type Status = 'not_configured' | 'disconnected' | 'connecting' | 'open';

export default function WhatsAppPage() {
  const [status, setStatus] = useState<Status>('not_configured');
  const [phone, setPhone] = useState('');
  const [profileName, setProfileName] = useState('');
  const [qrCode, setQrCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const checkStatus = useCallback(async () => {
    try {
      const res = await api.getWhatsappStatus();
      const data = res.data || res;
      setStatus(data.status || 'not_configured');
      setPhone(data.phone || '');
      setProfileName(data.profileName || '');
    } catch { setStatus('not_configured'); }
    setLoading(false);
  }, []);

  useEffect(() => { checkStatus(); }, [checkStatus]);

  // Poll for connection while connecting
  useEffect(() => {
    if (status !== 'connecting') return;
    const interval = setInterval(async () => {
      try {
        const res = await api.getWhatsappStatus();
        const data = res.data || res;
        if (data.status === 'open') {
          setStatus('open');
          setPhone(data.phone || '');
          setProfileName(data.profileName || '');
          clearInterval(interval);
        }
      } catch {}
    }, 3000);
    return () => clearInterval(interval);
  }, [status]);

  const handleConnect = async () => {
    setError(''); setLoading(true);
    try {
      await api.connectWhatsapp();
      setStatus('connecting');
      // Fetch QR code
      const qr = await api.getQrCode();
      setQrCode(qr.data?.qrcode || qr.data?.base64 || '');
    } catch (err: any) {
      setError(err.message || 'فشل إنشاء الاتصال');
    }
    setLoading(false);
  };

  const handleDisconnect = async () => {
    try {
      await api.del('/whatsapp/disconnect');
      setStatus('disconnected');
      setPhone('');
      setQrCode('');
    } catch (err: any) { setError(err.message); }
  };

  const refreshQr = async () => {
    try {
      const qr = await api.getQrCode();
      setQrCode(qr.data?.qrcode || qr.data?.base64 || '');
    } catch {}
  };

  if (loading) return <div className="flex items-center justify-center min-h-[400px]"><div className="h-8 w-8 border-3 border-green-500 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="p-6 space-y-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900">اتصال واتساب</h1>

      {error && <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm">{error}</div>}

      {/* Connection Status Card */}
      <div className={`rounded-2xl p-6 border-2 ${status === 'open' ? 'bg-green-50 border-green-300' : status === 'connecting' ? 'bg-amber-50 border-amber-300' : 'bg-gray-50 border-gray-200'}`}>
        <div className="flex items-center gap-4">
          <div className={`h-16 w-16 rounded-2xl flex items-center justify-center text-3xl text-white shadow-lg ${status === 'open' ? 'bg-green-500' : status === 'connecting' ? 'bg-amber-500 animate-pulse' : 'bg-gray-400'}`}>W</div>
          <div className="flex-1">
            <h2 className="text-lg font-bold text-gray-900">
              {status === 'open' && '✅ متصل بنجاح'}
              {status === 'connecting' && '⏳ جارٍ الاتصال...'}
              {status === 'disconnected' && '🔌 غير متصل'}
              {status === 'not_configured' && '📱 لم يتم الإعداد'}
            </h2>
            {status === 'open' && (
              <div className="mt-1 space-y-0.5">
                {phone && <p className="text-sm text-gray-600" dir="ltr">📞 {phone}</p>}
                {profileName && <p className="text-sm text-gray-600">👤 {profileName}</p>}
              </div>
            )}
            {status === 'connecting' && <p className="text-sm text-amber-700 mt-1">امسح رمز QR من تطبيق واتساب</p>}
            {(status === 'disconnected' || status === 'not_configured') && <p className="text-sm text-gray-500 mt-1">اضغط "اتصال" لربط رقم واتساب بمتجرك</p>}
          </div>
          <div>
            {status === 'open' && <button onClick={handleDisconnect} className="px-4 py-2 rounded-lg border-2 border-red-300 text-red-600 text-sm font-medium hover:bg-red-50">قطع الاتصال</button>}
            {(status === 'disconnected' || status === 'not_configured') && <button onClick={handleConnect} className="px-6 py-2.5 rounded-xl bg-green-500 hover:bg-green-600 text-white font-medium shadow-lg shadow-green-500/20">اتصال بواتساب</button>}
          </div>
        </div>
      </div>

      {/* QR Code */}
      {status === 'connecting' && (
        <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm text-center">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">امسح رمز QR</h3>
          {qrCode ? (
            <div className="inline-block p-4 bg-white border border-gray-200 rounded-2xl shadow-sm">
              <img src={qrCode.startsWith('data:') ? qrCode : `data:image/png;base64,${qrCode}`} alt="QR Code" className="w-64 h-64" />
            </div>
          ) : (
            <div className="mx-auto w-64 h-64 bg-gray-100 rounded-2xl flex items-center justify-center border-2 border-dashed border-gray-300">
              <div className="h-8 w-8 border-3 border-green-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
          <div className="mt-6 flex items-center justify-center gap-3">
            <button onClick={refreshQr} className="px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">🔄 تحديث الرمز</button>
          </div>
          <p className="mt-4 text-sm text-gray-500">الرمز صالح لمدة ٦٠ ثانية — سيتم التحديث تلقائياً</p>
        </div>
      )}

      {/* Steps */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
        <h3 className="font-semibold text-gray-900 mb-4">
          {status === 'open' ? 'معلومات الاتصال' : 'خطوات الاتصال'}
        </h3>

        {status === 'open' ? (
          <div className="grid grid-cols-2 gap-4 text-sm">
            {[
              { label: 'الحالة', value: 'متصل ✅', color: 'text-green-600' },
              { label: 'رقم الهاتف', value: phone || '-' },
              { label: 'اسم الحساب', value: profileName || '-' },
              { label: 'البروتوكول', value: 'Baileys via Evolution API' },
            ].map((s, i) => (
              <div key={i} className="flex justify-between py-2.5 border-b border-gray-50 last:border-0">
                <span className="text-gray-500">{s.label}</span>
                <span className={`font-medium ${s.color || 'text-gray-900'}`} dir="ltr">{s.value}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {[
              { step: '١', text: 'اضغط زر "اتصال بواتساب" أعلاه', done: status !== 'not_configured' && status !== 'disconnected' },
              { step: '٢', text: 'افتح تطبيق واتساب على هاتفك', done: false },
              { step: '٣', text: 'اذهب إلى الإعدادات ← الأجهزة المرتبطة ← ربط جهاز', done: false },
              { step: '٤', text: 'وجّه كاميرا هاتفك نحو رمز QR', done: false },
              { step: '٥', text: 'انتظر حتى يتم الاتصال — ستبدأ رسائل العملاء بالظهور تلقائياً', done: status === 'open' },
            ].map((s, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${s.done ? 'bg-green-500 text-white' : 'bg-green-100 text-green-700'}`}>
                  {s.done ? '✓' : s.step}
                </div>
                <p className={`text-sm ${s.done ? 'text-green-700 line-through' : 'text-gray-700'}`}>{s.text}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tips */}
      {status === 'open' && (
        <div className="bg-blue-50 rounded-2xl border border-blue-200 p-5">
          <h3 className="font-semibold text-blue-900 mb-2">💡 نصائح مهمة</h3>
          <div className="space-y-1.5 text-sm text-blue-800">
            <p>• تأكد أن هاتفك متصل بالإنترنت دائماً للحفاظ على الاتصال</p>
            <p>• الرسائل المستلمة ستظهر تلقائياً في صفحة المحادثات</p>
            <p>• يمكنك إرسال رسائل نصية وصور ومستندات من لوحة التحكم</p>
            <p>• لإرسال حملات جماعية، استخدم قوالب الرسائل المعتمدة من واتساب</p>
          </div>
        </div>
      )}
    </div>
  );
}
