import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { BroadcastsService } from '../../src/modules/broadcasts/broadcasts.service';
import { PrismaService } from '../../src/common/prisma/prisma.service';

describe('BroadcastsService', () => {
  let service: BroadcastsService;
  let prisma: any;

  const mockPrisma = {
    broadcast: { findMany: jest.fn(), findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
    contact: { findMany: jest.fn() },
  };
  const mockWhatsapp = { sendText: jest.fn(), sendTemplate: jest.fn() };
  const mockEvents = { onBroadcastCompleted: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BroadcastsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: 'WhatsappService', useValue: mockWhatsapp },
        { provide: 'EventBusService', useValue: mockEvents },
      ],
    }).compile();
    service = new BroadcastsService(mockPrisma as any, mockWhatsapp as any, mockEvents as any);
  });
  afterEach(() => jest.clearAllMocks());

  describe('send', () => {
    it('should throw if broadcast not found', async () => {
      mockPrisma.broadcast.findFirst.mockResolvedValue(null);
      await expect(service.send('t1', 'bad')).rejects.toThrow(NotFoundException);
    });

    it('should send to all matching contacts and fire EventBus', async () => {
      mockPrisma.broadcast.findFirst.mockResolvedValue({ id: 'b1', tenantId: 't1', content: 'Hello!', audience: {} });
      mockPrisma.contact.findMany.mockResolvedValue([{ phone: '0101' }, { phone: '0102' }]);
      mockPrisma.broadcast.update.mockResolvedValue({ id: 'b1', status: 'COMPLETED', sentCount: 2 });
      mockWhatsapp.sendText.mockResolvedValue({});

      await service.send('t1', 'b1');
      expect(mockWhatsapp.sendText).toHaveBeenCalledTimes(2);
      expect(mockEvents.onBroadcastCompleted).toHaveBeenCalled();
    });

    it('should count failures without stopping', async () => {
      mockPrisma.broadcast.findFirst.mockResolvedValue({ id: 'b1', tenantId: 't1', content: 'Hi', audience: {} });
      mockPrisma.contact.findMany.mockResolvedValue([{ phone: '0101' }, { phone: '0102' }, { phone: '0103' }]);
      mockPrisma.broadcast.update.mockResolvedValue({ id: 'b1', status: 'COMPLETED' });
      mockWhatsapp.sendText.mockResolvedValueOnce({}).mockRejectedValueOnce(new Error('fail')).mockResolvedValueOnce({});

      await service.send('t1', 'b1');
      // 2 success + 1 failure
      expect(mockPrisma.broadcast.update).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ sentCount: 2, failedCount: 1 }),
      }));
    });
  });

  describe('duplicate', () => {
    it('should throw if not found', async () => {
      mockPrisma.broadcast.findFirst.mockResolvedValue(null);
      await expect(service.duplicate('t1', 'bad')).rejects.toThrow(NotFoundException);
    });

    it('should create copy with DRAFT status', async () => {
      mockPrisma.broadcast.findFirst.mockResolvedValue({
        id: 'b1', tenantId: 't1', name: 'Campaign', content: 'Hi', audience: {}, status: 'COMPLETED',
        createdAt: new Date(), updatedAt: new Date(), startedAt: new Date(), completedAt: new Date(),
        sentCount: 100, deliveredCount: 90, readCount: 50, failedCount: 10, totalRecipients: 100,
        templateName: null, templateLang: null, mediaUrl: null, scheduledAt: null, retryCount: 0,
      });
      mockPrisma.broadcast.create.mockResolvedValue({ id: 'b2', name: 'Campaign (نسخة)', status: 'DRAFT' });

      const result = await service.duplicate('t1', 'b1');
      expect(mockPrisma.broadcast.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ status: 'DRAFT', totalRecipients: 0 }),
      }));
    });
  });

  describe('update', () => {
    it('should reject update on completed campaign', async () => {
      mockPrisma.broadcast.findFirst.mockResolvedValue({ id: 'b1', status: 'COMPLETED' });
      await expect(service.update('t1', 'b1', { name: 'New' } as any)).rejects.toThrow();
    });

    it('should allow update on draft campaign', async () => {
      mockPrisma.broadcast.findFirst.mockResolvedValue({ id: 'b1', status: 'DRAFT' });
      mockPrisma.broadcast.update.mockResolvedValue({ id: 'b1', name: 'Updated' });
      const result = await service.update('t1', 'b1', { name: 'Updated' } as any);
      expect(result.name).toBe('Updated');
    });
  });
});
