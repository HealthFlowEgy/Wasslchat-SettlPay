'use client';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import api from '../lib/api';
import { useWsEvent } from '../lib/websocket';

interface Conversation { id: string; contact: { name?: string; nameAr?: string; phone: string; avatar?: string }; lastMessageText?: string; lastMessageAt?: string; unreadCount: number; status: string; assignee?: { firstName: string } }
interface Message { id: string; direction: string; type: string; content?: string; mediaUrl?: string; createdAt: string }

export default function ConversationsPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selected, setSelected] = useState<Conversation | null>(null);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef<Conversation | null>(null);

  // Keep ref in sync with state for WebSocket handler
  useEffect(() => { selectedRef.current = selected; }, [selected]);

  useEffect(() => {
    api.getConversations().then(res => {
      setConversations(res.data?.data || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selected) return;
    api.getConversation(selected.id).then(res => {
      setMessages(res.data?.messages || []);
    });
  }, [selected?.id]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Real-time: listen for new inbound messages via WebSocket
  const handleNewMessage = useCallback((data: any) => {
    const msg = data?.message || data;
    // If the message belongs to the currently selected conversation, append it
    if (selectedRef.current && msg.conversationId === selectedRef.current.id) {
      setMessages(prev => {
        // Prevent duplicates
        if (prev.some(m => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    }
    // Update conversation list — move conversation to top and update preview
    setConversations(prev => {
      const convId = msg.conversationId;
      const idx = prev.findIndex(c => c.id === convId);
      if (idx === -1) return prev;
      const updated = [...prev];
      const conv = { ...updated[idx], lastMessageText: msg.content || '', lastMessageAt: msg.createdAt || new Date().toISOString() };
      if (selectedRef.current?.id !== convId) {
        conv.unreadCount = (conv.unreadCount || 0) + 1;
      }
      updated.splice(idx, 1);
      return [conv, ...updated];
    });
  }, []);

  // Real-time: listen for new orders via WebSocket (update conversation list badge)
  const handleNewOrder = useCallback((data: any) => {
    // Refresh conversations to pick up any new order-related messages
    api.getConversations().then(res => {
      setConversations(res.data?.data || []);
    }).catch(() => {});
  }, []);

  // Wire WebSocket events
  useWsEvent('message.inbound', handleNewMessage);
  useWsEvent('message.outbound', handleNewMessage);
  useWsEvent('order.created', handleNewOrder);

  const handleSend = async () => {
    if (!input.trim() || !selected) return;
    try {
      await api.sendMessage(selected.id, input);
      setInput('');
      // Refresh messages
      const res = await api.getConversation(selected.id);
      setMessages(res.data?.messages || []);
    } catch (err) { console.error('Send failed:', err); }
  };

  const formatTime = (d: string) => {
    if (!d) return '';
    const date = new Date(d);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    if (diff < 3600000) return `منذ ${Math.floor(diff/60000)} دقيقة`;
    if (diff < 86400000) return `منذ ${Math.floor(diff/3600000)} ساعة`;
    return date.toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' });
  };

  if (loading) return <div className="flex items-center justify-center h-full"><div className="h-8 w-8 border-3 border-green-500 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="flex h-[calc(100vh-56px)] lg:h-screen overflow-hidden">
      {/* Conversation List */}
      <div className="w-80 border-l border-gray-200 bg-white flex flex-col shrink-0">
        <div className="h-14 flex items-center px-4 border-b border-gray-100"><h2 className="font-semibold text-gray-900">المحادثات</h2><span className="mr-2 bg-green-500 text-white text-xs rounded-full px-1.5">{conversations.length}</span></div>
        <div className="p-3"><input placeholder="بحث..." className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:border-green-500" /></div>
        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 && <p className="p-4 text-sm text-gray-400 text-center">لا توجد محادثات بعد</p>}
          {conversations.map(conv => (
            <button key={conv.id} onClick={() => { setSelected(conv); setConversations(prev => prev.map(c => c.id === conv.id ? { ...c, unreadCount: 0 } : c)); }} className={`w-full flex items-center gap-3 p-3 border-b border-gray-50 hover:bg-gray-50 text-right ${selected?.id === conv.id ? 'bg-green-50' : ''}`}>
              <div className={`h-10 w-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0 ${conv.unreadCount > 0 ? 'bg-green-500' : 'bg-gray-300'}`}>{(conv.contact?.name || conv.contact?.phone || '?')[0]}</div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between"><span className="text-sm font-medium text-gray-900 truncate">{conv.contact?.name || conv.contact?.phone}</span><span className="text-xs text-gray-400">{formatTime(conv.lastMessageAt || '')}</span></div>
                <div className="flex justify-between mt-0.5"><span className="text-xs text-gray-500 truncate">{conv.lastMessageText || '...'}</span>{conv.unreadCount > 0 && <span className="bg-green-500 text-white text-xs rounded-full px-1.5">{conv.unreadCount}</span>}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col" style={{ background: '#efeae2' }}>
        {selected ? (<>
          <div className="h-14 flex items-center gap-3 px-4 bg-white border-b border-gray-200 shrink-0">
            <div className="h-9 w-9 rounded-full bg-green-500 flex items-center justify-center text-white font-bold text-sm">{(selected.contact?.name || '?')[0]}</div>
            <div><p className="text-sm font-semibold text-gray-900">{selected.contact?.name || selected.contact?.phone}</p><p className="text-xs text-green-500">{selected.status === 'OPEN' ? 'مفتوحة' : selected.status}</p></div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {messages.map(msg => (
              <div key={msg.id} className={`flex ${msg.direction === 'OUTBOUND' ? 'justify-start' : 'justify-end'}`}>
                <div className={`max-w-[70%] rounded-2xl px-4 py-2 shadow-sm ${msg.direction === 'OUTBOUND' ? 'bg-[#d9fdd3] rounded-tl-sm' : 'bg-white rounded-tr-sm'}`}>
                  {msg.mediaUrl && <img src={msg.mediaUrl} alt="" className="rounded-lg mb-1 max-w-[250px]" />}
                  <p className="text-sm text-gray-900 whitespace-pre-wrap">{msg.content}</p>
                  <p className="text-[10px] text-gray-400 text-left mt-1">{new Date(msg.createdAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
          <div className="p-3 bg-white border-t border-gray-200 shrink-0">
            <div className="flex items-center gap-2">
              <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSend()} placeholder="اكتب رسالة..." className="flex-1 rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none focus:border-green-500" />
              <button onClick={handleSend} disabled={!input.trim()} className="p-2.5 rounded-lg bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white">
                <svg className="h-5 w-5 rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
              </button>
            </div>
          </div>
        </>) : (
          <div className="flex-1 flex items-center justify-center"><div className="text-center"><div className="text-5xl mb-3">💬</div><p className="text-gray-500">اختر محادثة للبدء</p></div></div>
        )}
      </div>
    </div>
  );
}
