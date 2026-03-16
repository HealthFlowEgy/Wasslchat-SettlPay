import { Injectable, Logger } from '@nestjs/common';
import { WasslChatGateway } from '../../modules/websocket/websocket.gateway';
import { AutomationService } from '../../modules/automation/automation.service';
import { NotificationsService } from '../../modules/notifications/notifications.service';
import { AuditLogService } from '../../modules/audit-log/audit-log.service';
import { ChatbotsService } from '../../modules/chatbots/chatbots.service';
import { WebhookEndpointsService } from '../../modules/webhook-endpoints/webhook-endpoints.service';

/**
 * Central event bus that wires all isolated modules together.
 * Every business event flows through here to trigger:
 * 1. WebSocket real-time push to dashboard
 * 2. Automation rule evaluation
 * 3. In-app notification creation
 * 4. Audit log entry
 * 5. External webhook dispatch
 * 6. Chatbot trigger matching
 */
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

  // ===== ORDER EVENTS =====

  async onOrderCreated(tenantId: string, order: any, userId?: string) {
    this.logger.log(`Event: order.created — ${order.orderNumber}`);
    this.ws.emitNewOrder(tenantId, order);
    await this.notifications.notify(tenantId, 'NEW_ORDER', 'طلب جديد', 'طلب جديد', `طلب جديد رقم ${order.orderNumber} بقيمة ${order.total} ج.م`, `طلب رقم ${order.orderNumber}`, { orderId: order.id });
    await this.auditLog.log(tenantId, userId || null, 'order.created', 'order', order.id, { orderNumber: order.orderNumber, total: order.total });
    await this.automation.executeRules(tenantId, 'order.created', { orderId: order.id, total: order.total, contactId: order.contactId });
    await this.webhooks.dispatch(tenantId, 'order.created', { order });
  }

  async onOrderStatusChanged(tenantId: string, order: any, oldStatus: string, newStatus: string, userId?: string) {
    this.logger.log(`Event: order.status_changed — ${order.orderNumber}: ${oldStatus} → ${newStatus}`);
    this.ws.emitNewOrder(tenantId, order);
    await this.auditLog.log(tenantId, userId || null, 'order.status_changed', 'order', order.id, { from: oldStatus, to: newStatus });
    await this.automation.executeRules(tenantId, `order.${newStatus.toLowerCase()}`, { orderId: order.id, status: newStatus });
    await this.webhooks.dispatch(tenantId, 'order.status_changed', { order, oldStatus, newStatus });
  }

  // ===== PAYMENT EVENTS =====

  async onPaymentCompleted(tenantId: string, payment: any) {
    this.logger.log(`Event: payment.completed — ${payment.id}`);
    this.ws.emitPaymentUpdate(tenantId, payment);
    await this.notifications.notify(tenantId, 'PAYMENT_RECEIVED', 'دفعة جديدة', 'دفعة جديدة', `تم استلام ${payment.amount} ${payment.currency}`, `تم استلام دفعة`, { paymentId: payment.id, orderId: payment.orderId });
    await this.webhooks.dispatch(tenantId, 'payment.completed', { payment });
  }

  async onPaymentFailed(tenantId: string, payment: any) {
    this.ws.emitPaymentUpdate(tenantId, payment);
    await this.webhooks.dispatch(tenantId, 'payment.failed', { payment });
  }

  // ===== CONVERSATION/MESSAGE EVENTS =====

  async onNewInboundMessage(tenantId: string, conversationId: string, contactId: string, message: any, messageText: string) {
    this.logger.log(`Event: message.inbound — conversation ${conversationId}`);
    this.ws.emitNewMessage(tenantId, conversationId, message);
    this.ws.emitConversationUpdate(tenantId, { id: conversationId, lastMessageText: messageText });

    // Try chatbot matching first
    const matchedBot = await this.chatbots.matchTrigger(tenantId, messageText);
    if (matchedBot) {
      this.logger.log(`Chatbot matched: ${matchedBot.name} for message "${messageText.slice(0, 50)}"`);
      // In production: execute the flow via Typebot/n8n
    }

    await this.automation.executeRules(tenantId, 'message.inbound', { conversationId, contactId, text: messageText });
    await this.webhooks.dispatch(tenantId, 'message.inbound', { conversationId, message });
  }

  async onNewConversation(tenantId: string, conversation: any) {
    this.ws.emitConversationUpdate(tenantId, conversation);
    await this.notifications.notify(tenantId, 'NEW_CONVERSATION', 'محادثة جديدة', 'محادثة جديدة', 'عميل جديد بدأ محادثة', 'محادثة جديدة', { conversationId: conversation.id });
  }

  // ===== CONTACT EVENTS =====

  async onContactCreated(tenantId: string, contact: any) {
    this.logger.log(`Event: contact.created — ${contact.phone}`);
    await this.automation.executeRules(tenantId, 'contact.created', { contactId: contact.id, phone: contact.phone, source: contact.source });
    await this.webhooks.dispatch(tenantId, 'contact.created', { contact });
  }

  // ===== PRODUCT EVENTS =====

  async onLowStock(tenantId: string, product: any) {
    this.logger.log(`Event: product.low_stock — ${product.name}`);
    await this.notifications.notify(tenantId, 'LOW_STOCK', 'مخزون منخفض', 'مخزون منخفض', `${product.nameAr || product.name} — المتبقي: ${product.inventoryQuantity}`, `مخزون منخفض`, { productId: product.id });
    await this.automation.executeRules(tenantId, 'product.low_stock', { productId: product.id, quantity: product.inventoryQuantity });
  }

  // ===== BROADCAST EVENTS =====

  async onBroadcastCompleted(tenantId: string, broadcast: any) {
    await this.notifications.notify(tenantId, 'BROADCAST_COMPLETE', 'حملة مكتملة', 'حملة مكتملة', `${broadcast.name} — تم إرسال ${broadcast.sentCount} رسالة`, `حملة مكتملة`, { broadcastId: broadcast.id });
    await this.webhooks.dispatch(tenantId, 'broadcast.completed', { broadcast });
  }

  // ===== GENERIC AUDIT =====

  async audit(tenantId: string, userId: string | null, action: string, resource: string, resourceId?: string, details?: any) {
    await this.auditLog.log(tenantId, userId, action, resource, resourceId, details);
  }
}
