import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { WhatsappService } from '../whatsapp/whatsapp.service';
import { WasslChatGateway } from '../websocket/websocket.gateway';

const ALLOWED_MEDIA_TYPES = new Set(['image', 'video', 'audio', 'document', 'sticker']);

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
    // Query in ascending order directly — avoids an in-memory reversal on every page
    const [data, total] = await Promise.all([
      this.prisma.message.findMany({
        where: { conversationId },
        orderBy: { createdAt: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.message.count({ where: { conversationId } }),
    ]);
    return { data, meta: { total, page, limit } };
  }

  async sendText(tenantId: string, conversationId: string, senderId: string, text: string) {
    if (!text?.trim()) throw new BadRequestException('نص الرسالة لا يمكن أن يكون فارغاً');

    // Enforce tenant ownership on the conversation
    const conv = await this.prisma.conversation.findFirst({ where: { id: conversationId, tenantId }, include: { contact: true } });
    if (!conv) throw new NotFoundException('المحادثة غير موجودة');

    // Send via WhatsApp first — only persist the DB record if the send succeeds
    let whatsappMsgId: string | null = null;
    try {
      const result = await this.whatsapp.sendText(tenantId, conv.contact.phone, text);
      whatsappMsgId = result?.key?.id ?? null;
    } catch (err: any) {
      this.logger.error(`WhatsApp sendText failed for conversation ${conversationId}: ${err.message}`);
      throw new BadRequestException(`فشل إرسال الرسالة عبر واتساب: ${err.message}`);
    }

    const msg = await this.prisma.message.create({
      data: { conversationId, senderId, direction: 'OUTBOUND', type: 'TEXT', content: text, whatsappMsgId },
    });

    // Best-effort conversation metadata update
    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: new Date(), lastMessageText: text.slice(0, 200) },
    }).catch(e => this.logger.warn(`Conversation update failed: ${e.message}`));

    this.wsGateway.emitNewMessage(tenantId, conversationId, msg);
    return msg;
  }

  async sendMedia(tenantId: string, conversationId: string, senderId: string, mediaUrl: string, mediaType: string, caption?: string) {
    const normalizedType = mediaType.toLowerCase();
    if (!ALLOWED_MEDIA_TYPES.has(normalizedType)) {
      throw new BadRequestException(`نوع الوسائط غير مدعوم: ${mediaType}. الأنواع المدعومة: ${[...ALLOWED_MEDIA_TYPES].join(', ')}`);
    }

    // Reject non-http(s) URLs to prevent SSRF / javascript: injection
    try {
      const parsed = new URL(mediaUrl);
      if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('bad protocol');
    } catch {
      throw new BadRequestException('رابط الوسائط غير صالح — يجب أن يبدأ بـ http:// أو https://');
    }

    const conv = await this.prisma.conversation.findFirst({ where: { id: conversationId, tenantId }, include: { contact: true } });
    if (!conv) throw new NotFoundException('المحادثة غير موجودة');

    let whatsappMsgId: string | null = null;
    try {
      const result = await this.whatsapp.sendMedia(tenantId, conv.contact.phone, mediaUrl, normalizedType, caption);
      whatsappMsgId = result?.key?.id ?? null;
    } catch (err: any) {
      this.logger.error(`WhatsApp sendMedia failed for conversation ${conversationId}: ${err.message}`);
      throw new BadRequestException(`فشل إرسال الوسائط عبر واتساب: ${err.message}`);
    }

    const msg = await this.prisma.message.create({
      data: {
        conversationId, senderId, direction: 'OUTBOUND',
        type: normalizedType.toUpperCase() as any,
        mediaUrl, mediaCaption: caption, whatsappMsgId,
      },
    });

    this.wsGateway.emitNewMessage(tenantId, conversationId, msg);
    return msg;
  }

  async search(tenantId: string, query: string, page = 1, limit = 20) {
    if (!query?.trim()) throw new BadRequestException('نص البحث مطلوب');
    const where = {
      conversation: { tenantId },
      content: { contains: query.slice(0, 500), mode: 'insensitive' as any },
    };
    const [data, total] = await Promise.all([
      this.prisma.message.findMany({
        where,
        include: { conversation: { select: { id: true, contact: { select: { name: true, phone: true } } } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.message.count({ where }),
    ]);
    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }
}
