import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ConversationsService } from '../../src/modules/conversations/conversations.service';
import { PrismaService } from '../../src/common/prisma/prisma.service';

describe('ConversationsService', () => {
  let service: ConversationsService;
  let prisma: any;

  const mockPrisma = {
    conversation: { findMany: jest.fn(), findFirst: jest.fn(), create: jest.fn(), update: jest.fn(), count: jest.fn() },
    message: { create: jest.fn(), updateMany: jest.fn() },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ConversationsService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();
    service = module.get(ConversationsService);
    prisma = module.get(PrismaService);
  });
  afterEach(() => jest.clearAllMocks());

  describe('findOrCreateForContact', () => {
    it('should return existing conversation', async () => {
      prisma.conversation.findFirst.mockResolvedValue({ id: 'conv1', contactId: 'c1' });
      const result = await service.findOrCreateForContact('t1', 'c1');
      expect(result.id).toBe('conv1');
      expect(prisma.conversation.create).not.toHaveBeenCalled();
    });

    it('should create new conversation if none exists', async () => {
      prisma.conversation.findFirst.mockResolvedValue(null);
      prisma.conversation.create.mockResolvedValue({ id: 'conv-new', contactId: 'c1', status: 'OPEN' });
      const result = await service.findOrCreateForContact('t1', 'c1');
      expect(prisma.conversation.create).toHaveBeenCalled();
      expect(result.status).toBe('OPEN');
    });
  });

  describe('transfer', () => {
    it('should throw if conversation not found', async () => {
      prisma.conversation.findFirst.mockResolvedValue(null);
      await expect(service.transfer('t1', 'bad', 'agent1', 'agent2')).rejects.toThrow(NotFoundException);
    });

    it('should update assignee and create system note', async () => {
      prisma.conversation.findFirst.mockResolvedValue({ id: 'conv1' });
      prisma.conversation.update.mockResolvedValue({ id: 'conv1', assigneeId: 'agent2' });
      prisma.message.create.mockResolvedValue({ id: 'm1' });

      await service.transfer('t1', 'conv1', 'agent1', 'agent2', 'العميل يحتاج متخصص');
      expect(prisma.conversation.update).toHaveBeenCalledWith(expect.objectContaining({
        data: { assigneeId: 'agent2' },
      }));
      expect(prisma.message.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ content: expect.stringContaining('تحويل') }),
      }));
    });

    it('should skip note if none provided', async () => {
      prisma.conversation.findFirst.mockResolvedValue({ id: 'conv1' });
      prisma.conversation.update.mockResolvedValue({ id: 'conv1' });
      await service.transfer('t1', 'conv1', 'a1', 'a2');
      expect(prisma.message.create).not.toHaveBeenCalled();
    });
  });

  describe('markAsRead', () => {
    it('should reset unread count', async () => {
      prisma.conversation.update.mockResolvedValue({ id: 'conv1', unreadCount: 0 });
      prisma.message.updateMany.mockResolvedValue({ count: 5 });
      await service.markAsRead('t1', 'conv1');
      expect(prisma.conversation.update).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ unreadCount: 0 }),
      }));
    });
  });

  describe('assign', () => {
    it('should update assignee', async () => {
      prisma.conversation.update.mockResolvedValue({ id: 'conv1', assigneeId: 'agent1' });
      const result = await service.assign('t1', 'conv1', 'agent1');
      expect(result.assigneeId).toBe('agent1');
    });
  });
});
