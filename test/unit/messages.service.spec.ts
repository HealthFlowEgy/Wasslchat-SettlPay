import { Test, TestingModule } from '@nestjs/testing';
import { MessagesService } from '../../src/modules/messages/messages.service';
import { PrismaService } from '../../src/common/prisma/prisma.service';

describe('MessagesService', () => {
  let service: MessagesService;
  let prisma: any;

  const mockPrisma = {
    message: { findMany: jest.fn(), create: jest.fn(), count: jest.fn() },
    conversation: { findFirst: jest.fn(), update: jest.fn() },
  };
  const mockWhatsapp = { sendText: jest.fn().mockResolvedValue({ key: { id: 'wa-123' } }), sendMedia: jest.fn().mockResolvedValue({ key: { id: 'wa-456' } }) };
  const mockWsGateway = { emitNewMessage: jest.fn() };

  beforeEach(async () => {
    service = new MessagesService(mockPrisma as any, mockWhatsapp as any, mockWsGateway as any);
  });
  afterEach(() => jest.clearAllMocks());

  describe('getByConversation', () => {
    it('should return paginated messages in chronological order', async () => {
      mockPrisma.message.findMany.mockResolvedValue([{ id: 'm1', content: 'Hello' }]);
      mockPrisma.message.count.mockResolvedValue(1);
      const result = await service.getByConversation('conv1', { page: 1, limit: 50 });
      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });
  });

  describe('sendText', () => {
    it('should throw if conversation not found', async () => {
      mockPrisma.conversation.findFirst.mockResolvedValue(null);
      await expect(service.sendText('t1', 'bad', 'u1', 'Hello')).rejects.toThrow();
    });

    it('should send via WhatsApp, store in DB, and push via WebSocket', async () => {
      mockPrisma.conversation.findFirst.mockResolvedValue({ id: 'conv1', contact: { phone: '01012345678' } });
      mockPrisma.message.create.mockResolvedValue({ id: 'm1', content: 'Hello', direction: 'OUTBOUND' });
      mockPrisma.conversation.update.mockResolvedValue({});

      const result = await service.sendText('t1', 'conv1', 'u1', 'Hello');
      expect(mockWhatsapp.sendText).toHaveBeenCalledWith('t1', '01012345678', 'Hello');
      expect(mockPrisma.message.create).toHaveBeenCalled();
      expect(mockWsGateway.emitNewMessage).toHaveBeenCalledWith('t1', 'conv1', expect.any(Object));
    });
  });

  describe('search', () => {
    it('should search messages across conversations', async () => {
      mockPrisma.message.findMany.mockResolvedValue([{ id: 'm1', content: 'iPhone case', conversation: { id: 'c1', contact: { name: 'Ahmed' } } }]);
      mockPrisma.message.count.mockResolvedValue(1);
      const result = await service.search('t1', 'iPhone');
      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });
  });
});
