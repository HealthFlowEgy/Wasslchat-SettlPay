import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { WhatsappService } from '../whatsapp/whatsapp.service';
import { WasslChatGateway } from '../websocket/websocket.gateway';

@Injectable()
export class MessagesService {
  private readonly logger = new Logger(MessagesService.name);
  constructor(
    private prisma: PrismaService,
    private whatsapp: WhatsappService,
    private wsGateway: WasslChatGateway,
  ) {}

  async getByConversation(conversationId: string, query: { page?: number; limit?: number }) {
    const { page = 1, limit = 50 } = query;
    const [data, total] = await Promise.all([
      this.prisma.message.findMany({ where: { conversationId }, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
      this.prisma.message.count({ where: { conversationId } }),
    ]);
    return { data: data.reverse(), meta: { total, page, limit } };
  }

  async sendText(tenantId: string, conversationId: string, senderId: string, text: string) {
    const conv = await this.prisma.conversation.findFirst({ where: { id: conversationId }, include: { contact: true } });
    if (!conv) throw new Error('Conversation not found');

    const result = await this.whatsapp.sendText(tenantId, conv.contact.phone, text);
    const msg = await this.prisma.message.create({
      data: { conversationId, senderId, direction: 'OUTBOUND', type: 'TEXT', content: text, whatsappMsgId: result?.key?.id },
    });

    await this.prisma.conversation.update({ where: { id: conversationId }, data: { lastMessageAt: new Date(), lastMessageText: text.slice(0, 200) } });

    // Real-time push
    this.wsGateway.emitNewMessage(tenantId, conversationId, msg);
    return msg;
  }

  async sendMedia(tenantId: string, conversationId: string, senderId: string, mediaUrl: string, mediaType: string, caption?: string) {
    const conv = await this.prisma.conversation.findFirst({ where: { id: conversationId }, include: { contact: true } });
    if (!conv) throw new Error('Conversation not found');

    const result = await this.whatsapp.sendMedia(tenantId, conv.contact.phone, mediaUrl, mediaType, caption);
    const msg = await this.prisma.message.create({
      data: { conversationId, senderId, direction: 'OUTBOUND', type: mediaType.toUpperCase() as any, mediaUrl, mediaCaption: caption, whatsappMsgId: result?.key?.id },
    });

    this.wsGateway.emitNewMessage(tenantId, conversationId, msg);
    return msg;
  }
}
