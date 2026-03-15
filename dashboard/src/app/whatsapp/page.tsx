'use client';
import React, { useState } from 'react';

export default function WhatsAppPage() {
  const [status, setStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [phone, setPhone] = useState('');

  return (
    <div className="p-6 space-y-6" dir="rtl">
      <h1 className="text-2xl font-bold text-gray-900">اتصال واتساب</h1>

      {/* Connection Status */}
      <div className={`rounded-2xl p-6 border ${status === 'connected' ? 'bg-green-50 border-green-200' : status === 'connecting' ? 'bg-amber-50 border-amber-200' : 'bg-gray-50 border-gray-200'}`}>
        <div className="flex items-center gap-4">
          <div className={`h-16 w-16 rounded-2xl flex items-center justify-center text-3xl ${status === 'connected' ? 'bg-green-500' : 'bg-gray-300'} text-white`}>W</div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">
              {status === 'connected' ? '✅ متصل بنجاح' : status === 'connecting' ? '⏳ جارٍ الاتصال...' : '🔌 غير متصل'}
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {status === 'connected' ? `رقم الهاتف: ${phone || '+20 10 1234 5678'}` : 'امسح رمز QR من تطبيق واتساب للاتصال'}
            </p>
          </div>
          {status === 'connected' && (
            <button onClick={() => setStatus('disconnected')} className="mr-auto px-4 py-2 rounded-lg border border-red-200 text-red-600 text-sm font-medium hover:bg-red-50">قطع الاتصال</button>
          )}
        </div>
      </div>

      {/* QR Code */}
      {status !== 'connected' && (
        <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm text-center">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">امسح رمز QR</h3>
          {status === 'disconnected' ? (
            <>
              <div className="mx-auto w-64 h-64 bg-gray-100 rounded-2xl flex items-center justify-center border-2 border-dashed border-gray-300">
                <div className="text-center">
                  <div className="text-4xl mb-2">📱</div>
                  <p className="text-sm text-gray-500">اضغط "اتصال" لإنشاء رمز QR</p>
                </div>
              </div>
              <button onClick={() => setStatus('connecting')} className="mt-6 px-8 py-3 rounded-xl bg-green-500 hover:bg-green-600 text-white font-medium shadow-lg shadow-green-500/20">اتصال بواتساب</button>
            </>
          ) : (
            <>
              <div className="mx-auto w-64 h-64 bg-white rounded-2xl border border-gray-200 flex items-center justify-center p-4">
                {/* Mock QR Code */}
                <div className="w-full h-full bg-[repeating-conic-gradient(#000_0%_25%,#fff_0%_50%)] bg-[length:12px_12px] rounded-lg opacity-80" />
              </div>
              <p className="mt-4 text-sm text-gray-500">افتح واتساب &gt; الإعدادات &gt; الأجهزة المرتبطة &gt; ربط جهاز</p>
              <button onClick={() => { setStatus('connected'); setPhone('+20 10 1234 5678'); }} className="mt-4 px-6 py-2 rounded-lg bg-green-500 text-white text-sm font-medium">محاكاة الاتصال الناجح</button>
            </>
          )}
        </div>
      )}

      {/* Instructions */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
        <h3 className="font-semibold text-gray-900 mb-4">خطوات الاتصال</h3>
        <div className="space-y-3">
          {[
            { step: '١', text: 'افتح تطبيق واتساب على هاتفك' },
            { step: '٢', text: 'اذهب إلى الإعدادات > الأجهزة المرتبطة > ربط جهاز' },
            { step: '٣', text: 'وجّه كاميرا هاتفك نحو رمز QR أعلاه' },
            { step: '٤', text: 'انتظر حتى يتم الاتصال — سيبدأ استقبال الرسائل تلقائياً' },
          ].map((s, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-sm font-bold shrink-0">{s.step}</div>
              <p className="text-sm text-gray-700">{s.text}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Session Info */}
      {status === 'connected' && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-4">معلومات الجلسة</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            {[
              { label: 'الحالة', value: 'متصل ✅' },
              { label: 'رقم الهاتف', value: phone },
              { label: 'البروتوكول', value: 'Baileys (Evolution API)' },
              { label: 'متصل منذ', value: new Date().toLocaleString('ar-EG') },
            ].map((s, i) => (
              <div key={i} className="flex justify-between py-2 border-b border-gray-50">
                <span className="text-gray-500">{s.label}</span>
                <span className="font-medium text-gray-900">{s.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
