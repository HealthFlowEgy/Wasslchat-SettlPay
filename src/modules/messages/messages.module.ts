import { Module } from '@nestjs/common';
import { MessagesController } from './messages.controller';
import { MessageSearchController } from './message-search.controller';
import { MessagesService } from './messages.service';
import { WhatsappModule } from '../whatsapp/whatsapp.module';
@Module({
  imports: [WhatsappModule],
  controllers: [MessagesController, MessageSearchController],
  providers: [MessagesService],
  exports: [MessagesService],
})
export class MessagesModule {}
