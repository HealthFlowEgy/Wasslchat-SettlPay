import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  constructor(private config: ConfigService) {}

  async generateReply(message: string, context?: { customerName?: string; orderHistory?: string; language?: string }) {
    const apiKey = this.config.get('OPENAI_API_KEY');
    if (!apiKey) return { suggestion: null, error: 'OpenAI API key not configured' };
    try {
      const res = await axios.post('https://api.openai.com/v1/chat/completions', {
        model: 'gpt-4o-mini', max_tokens: 300,
        messages: [
          { role: 'system', content: `أنت مساعد خدمة عملاء لمتجر WhatsApp مصري. أجب باللغة العربية بشكل ودود ومهني. ${context?.customerName ? `اسم العميل: ${context.customerName}` : ''}` },
          { role: 'user', content: message },
        ],
      }, { headers: { Authorization: `Bearer ${apiKey}` } });
      return { suggestion: res.data.choices[0].message.content };
    } catch (err: any) {
      this.logger.error(`AI reply error: ${err.message}`);
      return { suggestion: null, error: err.message };
    }
  }

  async classifyIntent(message: string) {
    const intents = [
      { intent: 'order_inquiry', keywords: ['طلب', 'order', 'اين', 'where', 'تتبع', 'track', 'شحن', 'ship'] },
      { intent: 'product_inquiry', keywords: ['سعر', 'price', 'منتج', 'product', 'متوفر', 'available', 'كتالوج', 'catalog'] },
      { intent: 'complaint', keywords: ['مشكلة', 'problem', 'شكوى', 'complaint', 'سيء', 'bad', 'غضب'] },
      { intent: 'payment', keywords: ['دفع', 'pay', 'فوري', 'fawry', 'فودافون', 'vodafone', 'تحويل', 'transfer'] },
      { intent: 'greeting', keywords: ['مرحبا', 'hello', 'السلام', 'hi', 'صباح', 'مساء'] },
      { intent: 'return', keywords: ['إرجاع', 'return', 'استرجاع', 'refund', 'استبدال', 'exchange'] },
    ];
    const lower = message.toLowerCase();
    for (const i of intents) {
      if (i.keywords.some(k => lower.includes(k))) return { intent: i.intent, confidence: 0.85 };
    }
    return { intent: 'general', confidence: 0.5 };
  }

  async analyzeSentiment(text: string) {
    const positive = ['شكرا', 'ممتاز', 'رائع', 'جميل', 'thank', 'great', 'excellent', 'good', 'حلو'];
    const negative = ['سيء', 'مشكلة', 'غضب', 'bad', 'terrible', 'angry', 'زعلان', 'خلاص'];
    const lower = text.toLowerCase();
    if (positive.some(w => lower.includes(w))) return { sentiment: 'positive', score: 0.8 };
    if (negative.some(w => lower.includes(w))) return { sentiment: 'negative', score: -0.7 };
    return { sentiment: 'neutral', score: 0.0 };
  }

  async translateText(text: string, from: string, to: string) {
    const apiKey = this.config.get('OPENAI_API_KEY');
    if (!apiKey) return { translation: null, error: 'API key not configured' };
    try {
      const res = await axios.post('https://api.openai.com/v1/chat/completions', {
        model: 'gpt-4o-mini', max_tokens: 500,
        messages: [{ role: 'user', content: `Translate the following from ${from} to ${to}. Only return the translation:\n\n${text}` }],
      }, { headers: { Authorization: `Bearer ${apiKey}` } });
      return { translation: res.data.choices[0].message.content };
    } catch (err: any) { return { translation: null, error: err.message }; }
  }
}
