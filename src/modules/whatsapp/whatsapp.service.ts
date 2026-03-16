import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);
  private api: AxiosInstance;
  private readonly evoUrl: string;
  private readonly evoKey: string;

  constructor(private prisma: PrismaService, private config: ConfigService) {
    this.evoUrl = config.get('EVOLUTION_API_URL', 'http://localhost:8080');
    this.evoKey = config.get('EVOLUTION_API_KEY', '');
    this.api = axios.create({
      baseURL: this.evoUrl,
      headers: { apikey: this.evoKey },
    });
  }

  // Instance Management
  async createInstance(tenantId: string, instanceName: string) {
    const { data } = await this.api.post('/instance/create', {
      instanceName, integration: 'WHATSAPP-BAILEYS',
      qrcode: true, reject_call: true,
      webhook: { url: `${this.config.get('API_BASE_URL')}/webhooks/whatsapp/${tenantId}`, enabled: true, events: ['messages.upsert', 'connection.update', 'messages.update'] },
    });
    await this.prisma.whatsappSession.create({
      data: { tenantId, instanceName, instanceId: data?.instance?.instanceId, status: 'connecting' },
    });
    return data;
  }

  async getQrCode(tenantId: string) {
    const session = await this.prisma.whatsappSession.findFirst({ where: { tenantId } });
    if (!session) throw new NotFoundException('No WhatsApp session found');
    const { data } = await this.api.get(`/instance/qrcode/${session.instanceName}`);
    return data;
  }

  async getConnectionStatus(tenantId: string) {
    const session = await this.prisma.whatsappSession.findFirst({ where: { tenantId } });
    if (!session) return { status: 'not_configured' };
    try {
      const { data } = await this.api.get(`/instance/connectionState/${session.instanceName}`);
      const status = data?.instance?.state || 'disconnected';
      await this.prisma.whatsappSession.update({ where: { id: session.id }, data: { status } });
      return { status, phone: session.phone, profileName: session.profileName };
    } catch { return { status: 'disconnected' }; }
  }

  async disconnectInstance(tenantId: string) {
    const session = await this.prisma.whatsappSession.findFirst({ where: { tenantId } });
    if (!session) throw new NotFoundException('No WhatsApp session');
    await this.api.delete(`/instance/logout/${session.instanceName}`);
    await this.prisma.whatsappSession.update({ where: { id: session.id }, data: { status: 'disconnected', connectedAt: null } });
  }

  // Messaging
  async sendText(tenantId: string, phone: string, text: string) {
    const session = await this.getSession(tenantId);
    const { data } = await this.api.post(`/message/sendText/${session.instanceName}`, {
      number: this.formatPhone(phone), text,
    });
    return data;
  }

  async sendMedia(tenantId: string, phone: string, mediaUrl: string, mediaType: string, caption?: string) {
    const session = await this.getSession(tenantId);
    const { data } = await this.api.post(`/message/sendMedia/${session.instanceName}`, {
      number: this.formatPhone(phone), mediatype: mediaType, media: mediaUrl, caption,
    });
    return data;
  }

  async sendTemplate(tenantId: string, phone: string, templateName: string, params: string[]) {
    const session = await this.getSession(tenantId);
    const { data } = await this.api.post(`/message/sendTemplate/${session.instanceName}`, {
      number: this.formatPhone(phone), name: templateName, language: 'ar',
      components: [{ type: 'body', parameters: params.map(p => ({ type: 'text', text: p })) }],
    });
    return data;
  }

  async sendProductCatalog(tenantId: string, phone: string, productIds: string[]) {
    const products = await this.prisma.product.findMany({ where: { id: { in: productIds }, tenantId, isActive: true } });
    const catalog = products.map(p => `🛍️ *${p.nameAr || p.name}*\n💰 ${p.price} ${p.currency}\n${p.description || ''}`).join('\n\n---\n\n');
    const text = `📦 *كتالوج المنتجات*\n\n${catalog}\n\n✅ أرسل رقم المنتج للطلب`;
    return this.sendText(tenantId, phone, text);
  }

  /** Send read receipt (blue checkmarks) to customer via Evolution API */
  async sendReadReceipt(tenantId: string, remoteJid: string, messageId: string) {
    const session = await this.getSession(tenantId);
    if (!session?.instanceName) return;
    try {
      await axios.put(`${this.evoUrl}/chat/markMessageAsRead/${session.instanceName}`, {
        readMessages: [{ remoteJid, id: messageId }],
      }, { headers: { apikey: this.evoKey }, timeout: 5000 });
      this.logger.debug(`Read receipt sent for ${messageId} in ${remoteJid}`);
    } catch (err: any) {
      this.logger.warn(`Read receipt failed: ${err.message}`);
    }
  }

  /** Send typing indicator to customer */
  async sendTyping(tenantId: string, remoteJid: string, duration = 3000) {
    const session = await this.getSession(tenantId);
    if (!session?.instanceName) return;
    try {
      await axios.post(`${this.evoUrl}/chat/sendPresence/${session.instanceName}`, {
        number: remoteJid, presence: 'composing', delay: duration,
      }, { headers: { apikey: this.evoKey }, timeout: 5000 });
    } catch {}
  }

  // Helpers
  private async getSession(tenantId: string) {
    const session = await this.prisma.whatsappSession.findFirst({ where: { tenantId, status: 'open' } });
    if (!session) throw new NotFoundException('WhatsApp not connected. Please scan QR code.');
    return session;
  }

  private formatPhone(phone: string): string {
    let cleaned = phone.replace(/[^0-9]/g, '');
    if (cleaned.startsWith('0')) cleaned = '20' + cleaned.slice(1);
    if (!cleaned.startsWith('20')) cleaned = '20' + cleaned;
    return cleaned + '@s.whatsapp.net';
  }
}
