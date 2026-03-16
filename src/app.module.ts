import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './common/prisma/prisma.module';
import { TenantMiddleware } from './common/middleware/tenant.middleware';
import { RequestLoggerMiddleware } from './common/middleware/logger.middleware';
import { EventBusModule } from './common/events/event-bus.module';
import { AuthModule } from './modules/auth/auth.module';
import { TenantsModule } from './modules/tenants/tenants.module';
import { UsersModule } from './modules/users/users.module';
import { ProductsModule } from './modules/products/products.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { ContactsModule } from './modules/contacts/contacts.module';
import { OrdersModule } from './modules/orders/orders.module';
import { ConversationsModule } from './modules/conversations/conversations.module';
import { MessagesModule } from './modules/messages/messages.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { WhatsappModule } from './modules/whatsapp/whatsapp.module';
import { ChatbotsModule } from './modules/chatbots/chatbots.module';
import { BroadcastsModule } from './modules/broadcasts/broadcasts.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { AiModule } from './modules/ai/ai.module';
import { IntegrationsModule } from './modules/integrations/integrations.module';
import { TagsModule } from './modules/tags/tags.module';
import { QuickRepliesModule } from './modules/quick-replies/quick-replies.module';
import { AutomationModule } from './modules/automation/automation.module';
import { WebsocketModule } from './modules/websocket/websocket.module';
import { UploadsModule } from './modules/uploads/uploads.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { CouponsModule } from './modules/coupons/coupons.module';
import { AuditLogModule } from './modules/audit-log/audit-log.module';
import { WhatsappTemplatesModule } from './modules/whatsapp-templates/whatsapp-templates.module';
import { WebhookEndpointsModule } from './modules/webhook-endpoints/webhook-endpoints.module';
import { HealthModule } from './modules/health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env', '.env.local'] }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    ScheduleModule.forRoot(),
    PrismaModule,
    EventBusModule,
    AuthModule,
    TenantsModule,
    UsersModule,
    ProductsModule,
    CategoriesModule,
    ContactsModule,
    OrdersModule,
    ConversationsModule,
    MessagesModule,
    PaymentsModule,
    WhatsappModule,
    ChatbotsModule,
    BroadcastsModule,
    AnalyticsModule,
    AiModule,
    IntegrationsModule,
    TagsModule,
    QuickRepliesModule,
    AutomationModule,
    WebsocketModule,
    UploadsModule,
    NotificationsModule,
    CouponsModule,
    AuditLogModule,
    WhatsappTemplatesModule,
    WebhookEndpointsModule,
    HealthModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestLoggerMiddleware).forRoutes('*');
    consumer.apply(TenantMiddleware).exclude(
      'api/v1/auth/login', 'api/v1/auth/register', 'api/v1/auth/refresh',
      'api/v1/auth/reset-password',
      'api/v1/health(.*)', 'docs(.*)', 'webhooks(.*)', 'uploads(.*)',
    ).forRoutes('*');
  }
}
