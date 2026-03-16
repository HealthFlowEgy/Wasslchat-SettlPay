'use client';
import React, { useState, useEffect } from 'react';
import api from '../../lib/api';
import { useToast } from '../../lib/toast';

export default function WalletPage() {
  const [merchantWallet, setMerchantWallet] = useState<any>(null);
  const [customerWallets, setCustomerWallets] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [setupLoading, setSetupLoading] = useState(false);
  const [tab, setTab] = useState<'overview' | 'transactions' | 'customers'>('overview');
  const { toast } = useToast();

  // OTP verification state
  const [otpStep, setOtpStep] = useState<'idle' | 'otp_sent' | 'verified'>('idle');
  const [otpPhone, setOtpPhone] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [verifyLoading, setVerifyLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [mw, cw] = await Promise.all([
        api.get('/settlepay/merchant/wallet').catch(() => null),
        api.get('/settlepay/wallets?type=CUSTOMER').catch(() => ({ data: [] })),
      ]);
      setMerchantWallet(mw?.data || null);
      setCustomerWallets(cw?.data || []);

      if (mw?.data) {
        const tx = await api.get('/settlepay/merchant/transactions').catch(() => ({ data: { transactions: [] } }));
        setTransactions(tx?.data?.transactions || []);
        setOtpStep('verified');
      }
    } catch {}
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  // Step 1: Initiate setup — sends OTP to merchant owner's phone
  const initSetup = async () => {
    setSetupLoading(true);
    try {
      const res = await api.post('/settlepay/merchant/setup');
      setOtpPhone(res.data.phone);
      setOtpStep('otp_sent');
      toast(res.data.message || 'تم إرسال رمز التحقق', 'success');
    } catch (err: any) {
      toast(err.response?.data?.message || err.message, 'error');
    }
    setSetupLoading(false);
  };

  // Step 2: Verify OTP and activate wallet
  const verifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setVerifyLoading(true);
    try {
      const res = await api.post('/settlepay/merchant/verify', { mobile: otpPhone, otp: otpCode });
      setMerchantWallet(res.data);
      setOtpStep('verified');
      toast('تم تفعيل محفظة المتجر بنجاح!', 'success');
      fetchData();
    } catch (err: any) {
      toast(err.response?.data?.message || 'رمز التحقق غير صحيح', 'error');
    }
    setVerifyLoading(false);
  };

  if (loading) return <div className="flex items-center justify-center min-h-[400px]"><div className="h-8 w-8 border-3 border-green-500 border-t-transparent rounded-full animate-spin" /></div>;

  // Not setup yet — show OTP setup flow
  if (!merchantWallet) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">محفظة SettlePay</h1>
        <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center shadow-sm">
          <div className="mx-auto h-20 w-20 rounded-2xl bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center text-4xl text-white mb-6 shadow-lg">💳</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">فعّل محفظة SettlePay لمتجرك</h2>
          <p className="text-gray-500 mb-6 max-w-md mx-auto">
            استقبل مدفوعات فورية من عملائك مباشرة في محفظتك الرقمية عبر HealthPay.
            ادعم الدفع بالمحفظة، فوري، فيزا، وفودافون كاش.
          </p>

          <div className="grid grid-cols-3 gap-4 mb-6 max-w-sm mx-auto text-center">
            {[{ icon: '⚡', label: 'دفع فوري' }, { icon: '🔒', label: 'آمن ومشفر' }, { icon: '📊', label: 'تتبع مباشر' }].map((f, i) => (
              <div key={i} className="p-3 rounded-xl bg-green-50"><div className="text-2xl mb-1">{f.icon}</div><p className="text-xs text-green-700 font-medium">{f.label}</p></div>
            ))}
          </div>

          {otpStep === 'idle' && (
            <button onClick={initSetup} disabled={setupLoading} className="px-8 py-3 rounded-xl bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white font-medium text-lg shadow-lg shadow-green-500/20">
              {setupLoading ? 'جارٍ الإرسال...' : 'إرسال رمز التحقق'}
            </button>
          )}

          {otpStep === 'otp_sent' && (
            <form onSubmit={verifyOtp} className="max-w-xs mx-auto space-y-4 mt-4">
              <p className="text-sm text-gray-600">تم إرسال رمز التحقق إلى <span className="font-semibold text-gray-900" dir="ltr">{otpPhone}</span></p>
              <input
                type="text"
                value={otpCode}
                onChange={e => setOtpCode(e.target.value)}
                placeholder="أدخل رمز التحقق"
                maxLength={6}
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-center text-2xl tracking-[0.5em] outline-none focus:border-green-500"
                dir="ltr"
                autoFocus
                required
              />
              <button type="submit" disabled={verifyLoading || otpCode.length < 4} className="w-full px-6 py-3 rounded-xl bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white font-medium shadow-lg shadow-green-500/20">
                {verifyLoading ? 'جارٍ التحقق...' : 'تأكيد وتفعيل المحفظة'}
              </button>
              <button type="button" onClick={() => { setOtpStep('idle'); setOtpCode(''); }} className="text-sm text-gray-400 hover:text-gray-600">
                إعادة إرسال الرمز
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">محفظة SettlePay</h1>

      {/* Balance Card */}
      <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl p-6 text-white shadow-xl">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-green-100 text-sm">الرصيد المتاح</p>
            <p className="text-4xl font-bold mt-1">{(merchantWallet.balance || 0).toLocaleString()} <span className="text-xl">ج.م</span></p>
          </div>
          <div className="text-right">
            <div className="h-14 w-14 rounded-2xl bg-white/20 flex items-center justify-center text-3xl">💳</div>
            <p className="text-green-100 text-xs mt-2">EGP · {merchantWallet.walletType}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
        {[{ id: 'overview' as const, l: 'نظرة عامة' }, { id: 'transactions' as const, l: 'المعاملات' }, { id: 'customers' as const, l: 'محافظ العملاء' }].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`flex-1 py-2 rounded-md text-sm font-medium ${tab === t.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>{t.l}</button>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
        {/* OVERVIEW */}
        {tab === 'overview' && (
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900">تفاصيل المحفظة</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              {[
                { l: 'النوع', v: 'تاجر (Merchant)' },
                { l: 'العملة', v: merchantWallet.currency },
                { l: 'الحالة', v: merchantWallet.isActive ? 'نشطة' : 'معطّلة' },
                { l: 'تاريخ الإنشاء', v: new Date(merchantWallet.createdAt).toLocaleDateString('ar-EG') },
              ].map((r, i) => (
                <div key={i} className="flex justify-between py-2 border-b border-gray-50">
                  <span className="text-gray-500">{r.l}</span>
                  <span className="font-medium text-gray-900">{r.v}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TRANSACTIONS */}
        {tab === 'transactions' && (
          <div>
            <h3 className="font-semibold text-gray-900 mb-4">آخر المعاملات</h3>
            {transactions.length === 0 ? <p className="text-gray-400 text-sm text-center py-8">لا توجد معاملات بعد</p> : (
              <div className="space-y-2">
                {transactions.map((tx: any, i: number) => (
                  <div key={i} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
                    <div className="flex items-center gap-3">
                      <div className={`h-9 w-9 rounded-full flex items-center justify-center text-lg ${tx.amount > 0 ? 'bg-green-100' : 'bg-red-100'}`}>
                        {tx.amount > 0 ? '↓' : '↑'}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{tx.type || '-'}</p>
                        <p className="text-xs text-gray-400">{new Date(tx.createdAt).toLocaleString('ar-EG')}</p>
                      </div>
                    </div>
                    <p className={`text-sm font-semibold ${tx.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {tx.amount > 0 ? '+' : ''}{tx.amount?.toLocaleString()} ج.م
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* CUSTOMER WALLETS */}
        {tab === 'customers' && (
          <div>
            <h3 className="font-semibold text-gray-900 mb-4">محافظ العملاء ({customerWallets.length})</h3>
            {customerWallets.length === 0 ? <p className="text-gray-400 text-sm text-center py-8">لم يتم إنشاء محافظ عملاء بعد</p> : (
              <div className="space-y-2">
                {customerWallets.map((w: any, i: number) => (
                  <div key={i} className="flex items-center justify-between py-3 border-b border-gray-50">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-blue-100 flex items-center justify-center text-sm font-bold text-blue-700">{(w.contact?.name || '?')[0]}</div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{w.contact?.nameAr || w.contact?.name || w.contact?.phone || '-'}</p>
                        <p className="text-xs text-gray-400" dir="ltr">{w.contact?.phone || '-'}</p>
                      </div>
                    </div>
                    <p className="text-sm font-semibold text-gray-900">{(w.balance || 0).toLocaleString()} ج.م</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
