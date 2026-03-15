import { Controller, Post, Body, Param, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiExcludeEndpoint } from '@nestjs/swagger';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ContactsService } from '../contacts/contacts.service';
import { ConversationsService } from '../conversations/conversations.service';

@ApiTags('Webhooks')
@Controller('webhooks/whatsapp')
export class WhatsappWebhookController {
  private readonly logger = new Logger(WhatsappWebhookController.name);

  constructor(
    private prisma: PrismaService,
    private contacts: ContactsService,
    private conversations: ConversationsService,
  ) {}

  @Post(':tenantId')
  @ApiExcludeEndpoint()
  async handleWebhook(@Param('tenantId') tenantId: string, @Body() body: any) {
    this.logger.debug(`WhatsApp webhook for tenant ${tenantId}: ${body?.event}`);

    if (body?.event === 'messages.upsert') {
      await this.handleIncomingMessage(tenantId, body.data);
    } else if (body?.event === 'connection.update') {
      await this.handleConnectionUpdate(tenantId, body.data);
    }
    return { received: true };
  }

  private async handleIncomingMessage(tenantId: string, data: any) {
    try {
      const msg = data?.message?.[0] || data;
      if (!msg || msg.key?.fromMe) return;

      const phone = msg.key?.remoteJid?.replace('@s.whatsapp.net', '') || '';
      if (!phone) return;

      // Find or create contact
      const contact = await this.contacts.findOrCreateByPhone(tenantId, phone, {
        name: msg.pushName, whatsappId: msg.key?.remoteJid,
      });

      // Find or create conversation
      const conversation = await this.conversations.findOrCreateForContact(tenantId, contact.id);

      // Store message
      const content = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
      const type = msg.message?.imageMessage ? 'IMAGE' : msg.message?.videoMessage ? 'VIDEO' : msg.message?.audioMessage ? 'AUDIO' : msg.message?.documentMessage ? 'DOCUMENT' : 'TEXT';

      await this.prisma.message.create({
        data: {
          conversationId: conversation.id, direction: 'INBOUND', type: type as any,
          content, whatsappMsgId: msg.key?.id,
          mediaUrl: msg.message?.imageMessage?.url || msg.message?.videoMessage?.url || null,
        },
      });

      // Update conversation
      await this.prisma.conversation.update({
        where: { id: conversation.id },
        data: { lastMessageAt: new Date(), lastMessageText: content?.slice(0, 200), unreadCount: { increment: 1 }, status: 'OPEN' },
      });

      // Update contact
      await this.prisma.contact.update({
        where: { id: contact.id },
        data: { lastContactedAt: new Date() },
      });

      this.logger.log(`Message stored from ${phone} in conversation ${conversation.id}`);
    } catch (err) {
      this.logger.error(`Error processing message: ${err}`);
    }
  }

  private async handleConnectionUpdate(tenantId: string, data: any) {
    const state = data?.state || data?.connection;
    if (state) {
      await this.prisma.whatsappSession.updateMany({
        where: { tenantId },
        data: { status: state, ...(state === 'open' ? { connectedAt: new Date() } : {}) },
      });
    }
  }
}
