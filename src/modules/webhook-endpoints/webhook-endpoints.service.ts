import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import axios from 'axios';
import * as crypto from 'crypto';

@Injectable()
export class WebhookEndpointsService {
  private readonly logger = new Logger(WebhookEndpointsService.name);
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string) {
    return this.prisma.webhookEndpoint.findMany({ where: { tenantId }, orderBy: { createdAt: 'desc' } });
  }

  async create(tenantId: string, dto: { url: string; events: string[] }) {
    const secret = crypto.randomBytes(32).toString('hex');
    return this.prisma.webhookEndpoint.create({ data: { tenantId, url: dto.url, secret, events: dto.events } });
  }

  async update(tenantId: string, id: string, dto: { url?: string; events?: string[]; isActive?: boolean }) {
    const wh = await this.prisma.webhookEndpoint.findFirst({ where: { id, tenantId } });
    if (!wh) throw new NotFoundException('Webhook endpoint not found');
    return this.prisma.webhookEndpoint.update({ where: { id }, data: dto });
  }

  async delete(tenantId: string, id: string) {
    const wh = await this.prisma.webhookEndpoint.findFirst({ where: { id, tenantId } });
    if (!wh) throw new NotFoundException('Webhook endpoint not found');
    return this.prisma.webhookEndpoint.delete({ where: { id } });
  }

  async test(tenantId: string, id: string) {
    const wh = await this.prisma.webhookEndpoint.findFirst({ where: { id, tenantId } });
    if (!wh) throw new NotFoundException('Webhook endpoint not found');
    try {
      const payload = { event: 'test', tenantId, timestamp: new Date().toISOString(), data: { message: 'Webhook test from WasslChat' } };
      const signature = crypto.createHmac('sha256', wh.secret).update(JSON.stringify(payload)).digest('hex');
      await axios.post(wh.url, payload, { headers: { 'X-WasslChat-Signature': signature }, timeout: 10000 });
      return { success: true, message: 'Webhook delivered successfully' };
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  }

  // Called by other modules to dispatch events to all registered webhooks
  async dispatch(tenantId: string, event: string, data: any) {
    const endpoints = await this.prisma.webhookEndpoint.findMany({ where: { tenantId, isActive: true } });
    for (const ep of endpoints) {
      const events = ep.events as string[];
      if (events.length > 0 && !events.includes(event) && !events.includes('*')) continue;
      try {
        const payload = { event, tenantId, timestamp: new Date().toISOString(), data };
        const signature = crypto.createHmac('sha256', ep.secret).update(JSON.stringify(payload)).digest('hex');
        await axios.post(ep.url, payload, { headers: { 'X-WasslChat-Signature': signature }, timeout: 10000 });
        await this.prisma.webhookEndpoint.update({ where: { id: ep.id }, data: { lastTriggeredAt: new Date(), failCount: 0 } });
      } catch (err) {
        this.logger.error(`Webhook dispatch failed for ${ep.url}: ${err}`);
        await this.prisma.webhookEndpoint.update({ where: { id: ep.id }, data: { failCount: { increment: 1 } } });
      }
    }
  }
}
