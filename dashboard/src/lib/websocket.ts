'use client';
import { useEffect, useRef, useCallback } from 'react';

type WsEvent = 'new_message' | 'conversation_updated' | 'new_order' | 'payment_updated' | 'notification';
type WsHandler = (data: any) => void;

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001';

class WasslChatSocket {
  private socket: WebSocket | null = null;
  private handlers = new Map<WsEvent, Set<WsHandler>>();
  private reconnectTimer: any = null;
  private reconnectAttempts = 0;

  connect() {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token || this.socket?.readyState === WebSocket.OPEN) return;

    try {
      this.socket = new WebSocket(`${WS_URL}/ws?token=${token}`);

      this.socket.onopen = () => {
        console.log('[WS] Connected');
        this.reconnectAttempts = 0;
      };

      this.socket.onmessage = (event) => {
        try {
          const { event: evtName, data } = JSON.parse(event.data);
          const eventHandlers = this.handlers.get(evtName as WsEvent);
          if (eventHandlers) eventHandlers.forEach(h => h(data));
        } catch {}
      };

      this.socket.onclose = () => {
        console.log('[WS] Disconnected');
        this.scheduleReconnect();
      };

      this.socket.onerror = () => this.socket?.close();
    } catch {}
  }

  private scheduleReconnect() {
    if (this.reconnectAttempts >= 10) return;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    this.reconnectTimer = setTimeout(() => {
      this.reconnectAttempts++;
      this.connect();
    }, delay);
  }

  disconnect() {
    clearTimeout(this.reconnectTimer);
    this.socket?.close();
    this.socket = null;
  }

  on(event: WsEvent, handler: WsHandler) {
    if (!this.handlers.has(event)) this.handlers.set(event, new Set());
    this.handlers.get(event)!.add(handler);
    return () => this.handlers.get(event)?.delete(handler);
  }

  emit(event: string, data: any) {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ event, data }));
    }
  }
}

export const wsClient = new WasslChatSocket();

/** React hook for WebSocket events */
export function useWsEvent(event: WsEvent, handler: WsHandler) {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    wsClient.connect();
    const unsub = wsClient.on(event, (data) => handlerRef.current(data));
    return unsub;
  }, [event]);
}
