'use client';
import React, { useState, useEffect, useCallback } from 'react';
import api from '../lib/api';
import { useWsEvent, wsClient } from '../lib/websocket';

interface Conversation { id: string; contact: { name?: string; nameAr?: string; phone: string }; lastMessageText?: string; lastMessageAt?: string; unreadCount: number; status: string }
interface Message { id: string; direction: string; type: string; content?: string; mediaUrl?: string; createdAt: string }

export default function ConversationsPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selected, setSelected] = useState<Conversation | null>(null);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchConvs = useCallback(async () => {
    try { const r = await api.getConversations(); setConversations(r.data?.data || []); } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchConvs(); }, [fetchConvs]);

  useEffect(() => {
    if (!selected) return;
    api.getConversation(selected.id).then(r => setMessages(r.data?.messages || []));
  }, [selected?.id]);

  // Real-time: new messages
  useWsEvent('new_message', (data: any) => {
    if (data.conversationId === selected?.id && data.message) {
      setMessages(prev => [...prev, data.message]);
    }
    // Update sidebar
    setConversations(prev => prev.map(c =>
      c.id === data.conversationId
        ? { ...c, lastMessageText: data.message?.content || c.lastMessageText, lastMessageAt: new Date().toISOString(), unreadCount: c.id === selected?.id ? 0 : (c.unreadCount || 0) + 1 }
        : c
    ));
  });

  // Real-time: conversation updates (status changes, assignment)
  useWsEvent('conversation_updated', (data: any) => {
    setConversations(prev => prev.map(c => c.id === data.id ? { ...c, ...data } : c));
  });

  // Real-time: desktop notifications
  useWsEvent('notification', (data: any) => {
    if (data.type === 'NEW_MESSAGE' && Notification.permission === 'granted' && data.conversationId !== selected?.id) {
      new Notification('WasslChat', { body: 'رسالة جديدة من عميل', icon: '/favicon.ico' });
    }
  });

  const handleSend = async () => {
    if (!input.trim() || !selected) return;
    try {
      const r = await api.sendMessage(selected.id, input);
      if (r.data) setMessages(prev => [...prev, r.data]);
      setInput('');
    } catch {}
  };

  const fmt = (d: string) => { if (!d) return ''; const ms = Date.now() - new Date(d).getTime(); if (ms < 3600000) return `${Math.floor(ms/60000)} د`; if (ms < 86400000) return `${Math.floor(ms/3600000)} س`; return new Date(d).toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' }); };

  if (loading) return <div className="flex items-center justify-center h-full"><div className="h-8 w-8 border-3 border-green-500 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="flex h-[calc(100vh-56px)] lg:h-screen overflow-hidden">
      <div className="w-80 border-l border-gray-200 bg-white flex flex-col shrink-0">
        <div className="h-14 flex items-center px-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">المحادثات</h2>
          <span className="mr-2 bg-green-500 text-white text-xs rounded-full px-1.5">{conversations.length}</span>
          <button onClick={() => Notification.permission !== 'granted' && Notification.requestPermission()} className="mr-auto text-xs text-gray-400 hover:text-green-600" title="تفعيل الإشعارات">🔔</button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 && <p className="p-4 text-sm text-gray-400 text-center">لا توجد محادثات</p>}
          {conversations.map(c => (
            <button key={c.id} onClick={() => setSelected(c)} className={`w-full flex items-center gap-3 p-3 border-b border-gray-50 hover:bg-gray-50 text-right ${selected?.id === c.id ? 'bg-green-50' : ''}`}>
              <div className={`h-10 w-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0 ${c.unreadCount > 0 ? 'bg-green-500' : 'bg-gray-300'}`}>{(c.contact?.name || c.contact?.phone || '?')[0]}</div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between"><span className="text-sm font-medium text-gray-900 truncate">{c.contact?.nameAr || c.contact?.name || c.contact?.phone}</span><span className="text-xs text-gray-400">{fmt(c.lastMessageAt || '')}</span></div>
                <div className="flex justify-between mt-0.5"><span className="text-xs text-gray-500 truncate">{c.lastMessageText || '...'}</span>{c.unreadCount > 0 && <span className="bg-green-500 text-white text-xs rounded-full min-w-[20px] text-center px-1">{c.unreadCount}</span>}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 flex flex-col" style={{ background: '#efeae2' }}>
        {selected ? (<>
          <div className="h-14 flex items-center gap-3 px-4 bg-white border-b shrink-0">
            <div className="h-9 w-9 rounded-full bg-green-500 flex items-center justify-center text-white font-bold text-sm">{(selected.contact?.name || '?')[0]}</div>
            <div><p className="text-sm font-semibold text-gray-900">{selected.contact?.nameAr || selected.contact?.name || selected.contact?.phone}</p><p className="text-xs text-green-500">{selected.status === 'OPEN' ? 'متصل' : selected.status}</p></div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {messages.map(m => (
              <div key={m.id} className={`flex ${m.direction === 'OUTBOUND' ? 'justify-start' : 'justify-end'}`}>
                <div className={`max-w-[70%] rounded-2xl px-4 py-2 shadow-sm ${m.direction === 'OUTBOUND' ? 'bg-[#d9fdd3] rounded-tl-sm' : 'bg-white rounded-tr-sm'}`}>
                  {m.mediaUrl && <img src={m.mediaUrl} alt="" className="rounded-lg mb-1 max-w-[250px]" />}
                  <p className="text-sm text-gray-900 whitespace-pre-wrap">{m.content}</p>
                  <p className="text-[10px] text-gray-400 text-left mt-1">{new Date(m.createdAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="p-3 bg-white border-t shrink-0">
            <div className="flex items-center gap-2">
              <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSend()} placeholder="اكتب رسالة..." className="flex-1 rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none focus:border-green-500" />
              <button onClick={handleSend} disabled={!input.trim()} className="p-2.5 rounded-lg bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white"><svg className="h-5 w-5 rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg></button>
            </div>
          </div>
        </>) : (
          <div className="flex-1 flex items-center justify-center"><div className="text-center"><div className="text-5xl mb-3">💬</div><p className="text-gray-500">اختر محادثة للبدء</p></div></div>
        )}
      </div>
    </div>
  );
}
