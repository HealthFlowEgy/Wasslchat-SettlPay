import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class IntegrationsService {
  private readonly logger = new Logger(IntegrationsService.name);
  constructor(private prisma: PrismaService, private config: ConfigService) {}

  async findAll(tenantId: string) {
    return this.prisma.integration.findMany({ where: { tenantId }, orderBy: { createdAt: 'desc' } });
  }

  async create(tenantId: string, dto: { type: string; name: string; storeUrl?: string; apiKey?: string; apiSecret?: string }) {
    return this.prisma.integration.create({ data: { ...dto, tenantId, type: dto.type as any } });
  }

  async syncProducts(tenantId: string, integrationId: string) {
    const integration = await this.prisma.integration.findFirst({ where: { id: integrationId, tenantId } });
    if (!integration) throw new NotFoundException('التكامل غير موجود');

    if (integration.type === 'WOOCOMMERCE') return this.syncWooCommerce(tenantId, integration);
    if (integration.type === 'SHOPIFY') return this.syncShopify(tenantId, integration);
    throw new Error(`Unsupported integration type: ${integration.type}`);
  }

  private async syncWooCommerce(tenantId: string, integration: any) {
    const { storeUrl, apiKey, apiSecret } = integration;
    try {
      const res = await axios.get(`${storeUrl}/wp-json/wc/v3/products`, {
        auth: { username: apiKey!, password: apiSecret! }, params: { per_page: 100 },
      });
      let synced = 0;
      for (const wooProduct of res.data) {
        await this.prisma.product.upsert({
          where: { tenantId_sku: { tenantId, sku: `WOO-${wooProduct.id}` } },
          create: { tenantId, name: wooProduct.name, slug: wooProduct.slug + '-' + Date.now().toString(36), sku: `WOO-${wooProduct.id}`, price: parseFloat(wooProduct.price) || 0, description: wooProduct.short_description, images: wooProduct.images?.map((i: any) => i.src) || [], externalId: String(wooProduct.id), externalSource: 'woocommerce', inventoryQuantity: wooProduct.stock_quantity || 0 },
          update: { name: wooProduct.name, price: parseFloat(wooProduct.price) || 0, inventoryQuantity: wooProduct.stock_quantity || 0 },
        });
        synced++;
      }
      await this.prisma.integration.update({ where: { id: integration.id }, data: { lastSyncAt: new Date() } });
      return { synced, total: res.data.length };
    } catch (err: any) {
      this.logger.error(`WooCommerce sync error: ${err.message}`);
      throw err;
    }
  }

  private async syncShopify(tenantId: string, integration: any) {
    const { storeUrl, apiKey } = integration;
    try {
      const res = await axios.get(`https://${storeUrl}/admin/api/2024-01/products.json`, {
        headers: { 'X-Shopify-Access-Token': apiKey! },
      });
      let synced = 0;
      for (const product of res.data.products) {
        const variant = product.variants?.[0];
        await this.prisma.product.upsert({
          where: { tenantId_sku: { tenantId, sku: `SHOP-${product.id}` } },
          create: { tenantId, name: product.title, slug: product.handle + '-' + Date.now().toString(36), sku: `SHOP-${product.id}`, price: parseFloat(variant?.price) || 0, description: product.body_html, images: product.images?.map((i: any) => i.src) || [], externalId: String(product.id), externalSource: 'shopify', inventoryQuantity: variant?.inventory_quantity || 0 },
          update: { name: product.title, price: parseFloat(variant?.price) || 0, inventoryQuantity: variant?.inventory_quantity || 0 },
        });
        synced++;
      }
      await this.prisma.integration.update({ where: { id: integration.id }, data: { lastSyncAt: new Date() } });
      return { synced, total: res.data.products.length };
    } catch (err: any) {
      this.logger.error(`Shopify sync error: ${err.message}`);
      throw err;
    }
  }

  // Shipping: WasslBox
  async createShipment(tenantId: string, orderId: string, provider: string) {
    const order = await this.prisma.order.findFirst({ where: { id: orderId, tenantId }, include: { contact: true, items: true } });
    if (!order) throw new NotFoundException('الطلب غير موجود');

    if (provider === 'WASSLBOX') {
      const res = await axios.post(`${this.config.get('WASSLBOX_API_URL')}/shipments`, {
        orderId: order.orderNumber, recipientName: order.contact.name, recipientPhone: order.contact.phone,
        address: order.shippingAddress, items: order.items.map(i => ({ name: i.name, quantity: i.quantity })),
        cod: order.paymentMethod === 'COD' ? order.total : 0,
      }, { headers: { 'x-api-key': this.config.get('WASSLBOX_API_KEY') } });
      await this.prisma.order.update({ where: { id: orderId }, data: { shippingProvider: 'WASSLBOX', shippingTrackingNo: res.data.trackingNumber, status: 'SHIPPED', shippedAt: new Date() } });
      return res.data;
    }

    if (provider === 'BOSTA') {
      const res = await axios.post(`${this.config.get('BOSTA_API_URL')}/deliveries`, {
        type: 10, specs: { packageDetails: { itemsCount: order.items.length, description: `WasslChat Order ${order.orderNumber}` } },
        dropOffAddress: order.shippingAddress, receiver: { firstName: order.contact.name, phone: order.contact.phone },
        cod: order.paymentMethod === 'COD' ? order.total : 0,
      }, { headers: { Authorization: this.config.get('BOSTA_API_KEY') } });
      await this.prisma.order.update({ where: { id: orderId }, data: { shippingProvider: 'BOSTA', shippingTrackingNo: res.data.trackingNumber, status: 'SHIPPED', shippedAt: new Date() } });
      return res.data;
    }

    throw new Error(`Unsupported shipping provider: ${provider}`);
  }
}
