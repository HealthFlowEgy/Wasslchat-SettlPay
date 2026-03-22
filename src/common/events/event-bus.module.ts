import { Module, Global } from '@nestjs/common';
import { EventBusService } from './event-bus.service';
import { AutomationModule } from '../../modules/automation/automation.module';
import { NotificationsModule } from '../../modules/notifications/notifications.module';
import { AuditLogModule } from '../../modules/audit-log/audit-log.module';
import { ChatbotsModule } from '../../modules/chatbots/chatbots.module';
import { WebhookEndpointsModule } from '../../modules/webhook-endpoints/webhook-endpoints.module';
import { AiModule } from '../../modules/ai/ai.module';

@Global()
@Module({
  imports: [AutomationModule, NotificationsModule, AuditLogModule, ChatbotsModule, WebhookEndpointsModule, AiModule],
  providers: [EventBusService],
  exports: [EventBusService],
})
export class EventBusModule {}
