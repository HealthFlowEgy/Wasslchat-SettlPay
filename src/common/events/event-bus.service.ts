import { Injectable, Logger } from '@nestjs/common';
import { WasslChatGateway } from '../../modules/websocket/websocket.gateway';
import { AutomationService } from '../../modules/automation/automation.service';
import { NotificationsService } from '../../modules/notifications/notifications.service';
import { AuditLogService } from '../../modules/audit-log/audit-log.service';
import { ChatbotsService } from '../../modules/chatbots/chatbots.service';
import { WebhookEndpointsService } from '../../modules/webhook-endpoints/webhook-endpoints.service';

@Injectable()
export class EventBusService {
  private readonly logger = new Logger(EventBusService.name);

  constructor(
    private ws: WasslChatGateway,
    private automation: AutomationService,
    private notifications: NotificationsService,
    private auditLog: AuditLogService,
    private chatbots: ChatbotsService,
    private webhooks: WebhookEndpointsService,
  ) {}

  /** Safe wrapper — logs errors but never throws, so one failing handler can't break the chain */
  private async safe(label: string, fn: () => Promise<any>): Promise<void> {
    try { await fn(); } catch (err) { this.logger.error(`EventBus [${label}] failed: ${err}`); }
  }

  // ===== ORDER EVENTS =====

  async onOrderCreated(tenantId: string, order: any, userId?: string) {
    this.logger.log(`order.created — ${order.orderNumber}`);
    this.ws.emitNewOrder(tenantId, order);
    await this.safe('notify:order', () => this.notifications.notify(tenantId, 'NEW_ORDER', 'طلب جديد', 'طلب جديد', `طلب رقم ${order.orderNumber} بقيمة ${order.total} ج.م`, `طلب جديد`, { orderId: order.id }));
    await this.safe('audit:order', () => this.auditLog.log(tenantId, userId || null, 'order.created', 'order', order.id, { orderNumber: order.orderNumber, total: order.total }));
    await this.safe('automation:order', () => this.automation.executeRules(tenantId, 'order.created', { orderId: order.id, total: order.total, contactId: order.contactId }));
    await this.safe('webhook:order', () => this.webhooks.dispatch(tenantId, 'order.created', { order }));
  }

  async onOrderStatusChanged(tenantId: string, order: any, oldStatus: string, newStatus: string, userId?: string) {
    this.logger.log(`order.status_changed — ${order.orderNumber}: ${oldStatus} → ${newStatus}`);
    this.ws.emitNewOrder(tenantId, order);
    await this.safe('audit:status', () => this.auditLog.log(tenantId, userId || null, 'order.status_changed', 'order', order.id, { from: oldStatus, to: newStatus }));
    await this.safe('automation:status', () => this.automation.executeRules(tenantId, `order.${newStatus.toLowerCase()}`, { orderId: order.id, status: newStatus }));
    await this.safe('webhook:status', () => this.webhooks.dispatch(tenantId, 'order.status_changed', { order, oldStatus, newStatus }));
  }

  // ===== PAYMENT EVENTS =====

  async onPaymentCompleted(tenantId: string, payment: any) {
    this.ws.emitPaymentUpdate(tenantId, payment);
    await this.safe('notify:payment', () => this.notifications.notify(tenantId, 'PAYMENT_RECEIVED', 'دفعة جديدة', 'دفعة جديدة', `تم استلام ${payment.amount} ${payment.currency}`, `دفعة جديدة`, { paymentId: payment.id }));
    this.ws.emitNotification(tenantId, { type: 'PAYMENT_RECEIVED', amount: payment.amount });
    await this.safe('webhook:payment', () => this.webhooks.dispatch(tenantId, 'payment.completed', { payment }));
  }

  async onPaymentFailed(tenantId: string, payment: any) {
    this.ws.emitPaymentUpdate(tenantId, payment);
    await this.safe('webhook:payment_fail', () => this.webhooks.dispatch(tenantId, 'payment.failed', { payment }));
  }

  // ===== CONVERSATION/MESSAGE EVENTS =====

  async onNewInboundMessage(tenantId: string, conversationId: string, contactId: string, message: any, messageText: string) {
    this.ws.emitNewMessage(tenantId, conversationId, message);
    this.ws.emitConversationUpdate(tenantId, { id: conversationId, lastMessageText: messageText });
    this.ws.emitNotification(tenantId, { type: 'NEW_MESSAGE', conversationId });

    // Chatbot matching
    await this.safe('chatbot:match', async () => {
      const matched = await this.chatbots.matchTrigger(tenantId, messageText);
      if (matched) this.logger.log(`Chatbot matched: ${matched.name}`);
    });

    await this.safe('automation:msg', () => this.automation.executeRules(tenantId, 'message.inbound', { conversationId, contactId, text: messageText }));
    await this.safe('webhook:msg', () => this.webhooks.dispatch(tenantId, 'message.inbound', { conversationId, message }));
  }

  async onNewConversation(tenantId: string, conversation: any) {
    this.ws.emitConversationUpdate(tenantId, conversation);
    this.ws.emitNotification(tenantId, { type: 'NEW_CONVERSATION', conversationId: conversation.id });
    await this.safe('notify:conv', () => this.notifications.notify(tenantId, 'NEW_CONVERSATION', 'محادثة جديدة', 'محادثة جديدة', 'عميل جديد بدأ محادثة', 'محادثة جديدة', { conversationId: conversation.id }));
  }

  // ===== CONTACT EVENTS =====

  async onContactCreated(tenantId: string, contact: any) {
    await this.safe('automation:contact', () => this.automation.executeRules(tenantId, 'contact.created', { contactId: contact.id, phone: contact.phone, source: contact.source }));
    await this.safe('webhook:contact', () => this.webhooks.dispatch(tenantId, 'contact.created', { contact }));
  }

  // ===== PRODUCT EVENTS =====

  async onLowStock(tenantId: string, product: any) {
    this.ws.emitNotification(tenantId, { type: 'LOW_STOCK', productId: product.id, name: product.nameAr || product.name });
    await this.safe('notify:stock', () => this.notifications.notify(tenantId, 'LOW_STOCK', 'مخزون منخفض', 'مخزون منخفض', `${product.nameAr || product.name} — المتبقي: ${product.inventoryQuantity}`, `مخزون منخفض`, { productId: product.id }));
    await this.safe('automation:stock', () => this.automation.executeRules(tenantId, 'product.low_stock', { productId: product.id, quantity: product.inventoryQuantity }));
  }

  // ===== BROADCAST EVENTS =====

  async onBroadcastCompleted(tenantId: string, broadcast: any) {
    this.ws.emitNotification(tenantId, { type: 'BROADCAST_COMPLETE', broadcastId: broadcast.id });
    await this.safe('notify:broadcast', () => this.notifications.notify(tenantId, 'BROADCAST_COMPLETE', 'حملة مكتملة', 'حملة مكتملة', `${broadcast.name} — ${broadcast.sentCount} رسالة`, `حملة مكتملة`, { broadcastId: broadcast.id }));
    await this.safe('webhook:broadcast', () => this.webhooks.dispatch(tenantId, 'broadcast.completed', { broadcast }));
  }

  // ===== GENERIC =====

  async audit(tenantId: string, userId: string | null, action: string, resource: string, resourceId?: string, details?: any) {
    await this.safe('audit', () => this.auditLog.log(tenantId, userId, action, resource, resourceId, details));
  }
}
