import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

const MAX_INPUT_LENGTH = 2000;
const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  constructor(private config: ConfigService) {}

  private get model(): string { return this.config.get('OPENAI_MODEL', 'gpt-4o-mini'); }
  private get apiKey(): string | undefined { return this.config.get('OPENAI_API_KEY'); }

  /** Centralised OpenAI call — returns raw text or null on any error */
  private async openai(messages: { role: string; content: string }[], maxTokens = 400): Promise<string | null> {
    const apiKey = this.apiKey;
    if (!apiKey) return null;
    try {
      const res = await axios.post(OPENAI_URL, {
        model: this.model,
        max_tokens: maxTokens,
        messages,
      }, {
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        timeout: 20000,
      });
      return res.data.choices?.[0]?.message?.content ?? null;
    } catch (err: any) {
      this.logger.error(`OpenAI error: ${err.message}`);
      return null;
    }
  }

  // ── Existing: generate a single reply suggestion ──────────────────────────

  async generateReply(message: string, context?: { customerName?: string; orderHistory?: string; language?: string }) {
    const apiKey = this.apiKey;
    if (!apiKey) return { suggestion: null, error: 'OpenAI API key not configured' };
    const safe = message.slice(0, MAX_INPUT_LENGTH);
    const text = await this.openai([
      { role: 'system', content: `أنت مساعد خدمة عملاء لمتجر WhatsApp مصري. أجب باللغة العربية بشكل ودود ومهني.${context?.customerName ? ` اسم العميل: ${context.customerName}` : ''}` },
      { role: 'user', content: safe },
    ], 300);
    if (!text) return { suggestion: null, error: 'AI unavailable' };
    return { suggestion: text };
  }

  // ── NEW: 3 diverse smart-reply options ───────────────────────────────────

  async generateSmartReplies(message: string, context?: { customerName?: string; conversationHistory?: string }): Promise<string[]> {
    const safe = message.slice(0, MAX_INPUT_LENGTH);
    const systemPrompt = [
      'أنت مساعد خدمة عملاء مصري محترف.',
      'بناءً على رسالة العميل، اقترح 3 ردود قصيرة ومتنوعة (ودية، رسمية، سريعة).',
      'أعد **فقط** JSON مصفوفة من 3 نصوص عربية. مثال: ["رد ١","رد ٢","رد ٣"]',
      context?.customerName ? `اسم العميل: ${context.customerName}` : '',
    ].filter(Boolean).join(' ');

    const raw = await this.openai([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: safe },
    ], 300);

    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw.trim());
      if (Array.isArray(parsed)) return parsed.slice(0, 3).map(String);
    } catch { /* fallback below */ }

    // Fallback: split on newlines if JSON parse failed
    return raw.split('\n').map(l => l.replace(/^["\-\d\.\s]+/, '').trim()).filter(Boolean).slice(0, 3);
  }

  // ── NEW: combined intent + sentiment in one API call ────────────────────

  async analyzeMessage(text: string): Promise<{
    intent: string; intentConfidence: number;
    sentiment: string; sentimentScore: number;
    urgency: 'low' | 'medium' | 'high';
  }> {
    const safe = text.slice(0, MAX_INPUT_LENGTH);
    const raw = await this.openai([
      {
        role: 'system',
        content: 'أنت محلل نصوص. استجب **فقط** بـ JSON بالصيغة: {"intent":"...","intentConfidence":0.0,"sentiment":"positive|negative|neutral","sentimentScore":0.0,"urgency":"low|medium|high"}',
      },
      { role: 'user', content: safe },
    ], 150);

    if (raw) {
      try {
        const parsed = JSON.parse(raw.trim());
        return {
          intent: parsed.intent || 'general',
          intentConfidence: Number(parsed.intentConfidence) || 0.5,
          sentiment: parsed.sentiment || 'neutral',
          sentimentScore: Number(parsed.sentimentScore) || 0,
          urgency: ['low', 'medium', 'high'].includes(parsed.urgency) ? parsed.urgency : 'low',
        };
      } catch { /* fall through to keyword analysis */ }
    }

    return this.keywordAnalyze(text);
  }

  // ── NEW: Arabic conversation summary (called on RESOLVED) ────────────────

  async summarizeConversation(messages: { direction: string; content: string; createdAt: Date }[]): Promise<string | null> {
    if (!messages.length) return null;
    const last30 = messages.slice(-30);
    const transcript = last30
      .map(m => `${m.direction === 'INBOUND' ? 'العميل' : 'الوكيل'}: ${m.content}`)
      .join('\n');

    return this.openai([
      { role: 'system', content: 'لخّص المحادثة التالية في 2-3 جمل عربية موجزة. اذكر المشكلة والحل إن وُجد.' },
      { role: 'user', content: transcript.slice(0, MAX_INPUT_LENGTH) },
    ], 200);
  }

  // ── NEW: RFM engagement score (pure math, no API call) ───────────────────

  computeEngagementScore(contact: {
    totalOrders: number;
    totalSpent: number;
    lastOrderAt?: Date | null;
  }): number {
    const now = Date.now();
    const lastOrder = contact.lastOrderAt ? new Date(contact.lastOrderAt).getTime() : 0;
    const daysSinceLast = lastOrder ? (now - lastOrder) / 86_400_000 : 999;

    // Recency  (30%) — full score within 7 days, zero at 90+ days
    const recency = Math.max(0, 1 - daysSinceLast / 90) * 30;

    // Frequency (30%) — capped at 10 orders for full score
    const frequency = Math.min(contact.totalOrders / 10, 1) * 30;

    // Monetary  (40%) — capped at 5 000 EGP for full score
    const monetary = Math.min(Number(contact.totalSpent) / 5000, 1) * 40;

    return Math.round(recency + frequency + monetary);
  }

  // ── Legacy: delegate to analyzeMessage ───────────────────────────────────

  async classifyIntent(message: string) {
    const r = await this.analyzeMessage(message);
    return { intent: r.intent, confidence: r.intentConfidence };
  }

  async analyzeSentiment(text: string) {
    const r = await this.analyzeMessage(text);
    return { sentiment: r.sentiment, score: r.sentimentScore };
  }

  // ── Existing: translate ───────────────────────────────────────────────────

  async translateText(text: string, from: string, to: string) {
    const apiKey = this.apiKey;
    if (!apiKey) return { translation: null, error: 'API key not configured' };
    const safe = text.slice(0, MAX_INPUT_LENGTH);
    const translation = await this.openai([
      { role: 'user', content: `Translate the following from ${from} to ${to}. Only return the translation:\n\n${safe}` },
    ], 500);
    if (!translation) return { translation: null, error: 'AI unavailable' };
    return { translation };
  }

  // ── Private: keyword-only fallback ───────────────────────────────────────

  private keywordAnalyze(text: string): {
    intent: string; intentConfidence: number;
    sentiment: string; sentimentScore: number;
    urgency: 'low' | 'medium' | 'high';
  } {
    const intents = [
      { intent: 'order_inquiry',   keywords: ['طلب', 'order', 'اين', 'where', 'تتبع', 'track', 'شحن', 'ship'] },
      { intent: 'product_inquiry', keywords: ['سعر', 'price', 'منتج', 'product', 'متوفر', 'available'] },
      { intent: 'complaint',       keywords: ['مشكلة', 'problem', 'شكوى', 'complaint', 'سيء', 'bad', 'غضب'] },
      { intent: 'payment',         keywords: ['دفع', 'pay', 'فوري', 'fawry', 'فودافون', 'vodafone'] },
      { intent: 'greeting',        keywords: ['مرحبا', 'hello', 'السلام', 'hi', 'صباح', 'مساء'] },
      { intent: 'return',          keywords: ['إرجاع', 'return', 'استرجاع', 'refund', 'استبدال', 'exchange'] },
    ];
    const positive = ['شكرا', 'ممتاز', 'رائع', 'جميل', 'thank', 'great', 'excellent', 'good', 'حلو'];
    const negative = ['سيء', 'مشكلة', 'غضب', 'bad', 'terrible', 'angry', 'زعلان', 'خلاص'];
    const urgentWords = ['عاجل', 'urgent', 'الآن', 'now', 'فوري', 'مشكلة', 'problem'];

    const lower = text.toLowerCase();
    let intent = 'general', intentConfidence = 0.5;
    for (const i of intents) {
      if (i.keywords.some(k => lower.includes(k))) { intent = i.intent; intentConfidence = 0.85; break; }
    }
    let sentiment = 'neutral', sentimentScore = 0;
    if (positive.some(w => lower.includes(w))) { sentiment = 'positive'; sentimentScore = 0.8; }
    else if (negative.some(w => lower.includes(w))) { sentiment = 'negative'; sentimentScore = -0.7; }
    const urgency: 'low' | 'medium' | 'high' = urgentWords.some(w => lower.includes(w)) ? 'high' : 'low';
    return { intent, intentConfidence, sentiment, sentimentScore, urgency };
  }
}
