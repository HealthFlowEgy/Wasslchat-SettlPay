'use client';
import React, { useState } from 'react';
import api from '../../lib/api';
import { useAuth } from '../../lib/auth-provider';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      const res = await api.login(email, password);
      const { tokens, user } = res.data;
      api.setToken(tokens.accessToken);
      login(tokens.accessToken, tokens.refreshToken, user);
    } catch (err: any) { setError(err.message || 'فشل تسجيل الدخول'); }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4" dir="rtl">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="mx-auto h-14 w-14 rounded-2xl bg-green-500 flex items-center justify-center text-white text-2xl font-bold mb-4">W</div>
          <h1 className="text-2xl font-bold text-gray-900">WasslChat</h1>
          <p className="text-gray-500 mt-1">سجّل دخولك لإدارة متجرك</p>
        </div>
        {error && <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm">{error}</div>}
        <form onSubmit={handleLogin} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-4">
          <div><label className="block text-sm font-medium text-gray-700 mb-1">البريد الإلكتروني</label><input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" dir="ltr" className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20" required /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">كلمة المرور</label><input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-green-500" required /></div>
          <button type="submit" disabled={loading} className="w-full py-2.5 rounded-lg bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white font-medium text-sm">{loading ? 'جارٍ التسجيل...' : 'تسجيل الدخول'}</button>
        </form>
        <p className="text-center text-sm text-gray-400 mt-4">demo@wasslchat.com / demo2026</p>
      </div>
    </div>
  );
}
