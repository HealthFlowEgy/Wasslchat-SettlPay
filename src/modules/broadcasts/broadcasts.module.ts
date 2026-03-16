import { Module } from '@nestjs/common';
import { BroadcastsController } from './broadcasts.controller';
import { BroadcastsService } from './broadcasts.service';
import { BroadcastSchedulerService } from './broadcast-scheduler.service';
import { WhatsappModule } from '../whatsapp/whatsapp.module';
@Module({
  imports: [WhatsappModule],
  controllers: [BroadcastsController],
  providers: [BroadcastsService, BroadcastSchedulerService],
  exports: [BroadcastsService],
})
export class BroadcastsModule {}
