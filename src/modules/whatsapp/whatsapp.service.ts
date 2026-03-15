import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);
  private api: AxiosInstance;

  constructor(private prisma: PrismaService, private config: ConfigService) {
    this.api = axios.create({
      baseURL: config.get('EVOLUTION_API_URL', 'http://localhost:8080'),
      headers: { apikey: config.get('EVOLUTION_API_KEY', '') },
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
