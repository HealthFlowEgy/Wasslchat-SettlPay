import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsService } from '../../src/modules/notifications/notifications.service';
import { PrismaService } from '../../src/common/prisma/prisma.service';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let prisma: any;

  const mockPrisma = {
    notification: { findMany: jest.fn(), create: jest.fn(), update: jest.fn(), updateMany: jest.fn(), delete: jest.fn(), count: jest.fn() },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [NotificationsService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();
    service = module.get(NotificationsService);
    prisma = module.get(PrismaService);
  });
  afterEach(() => jest.clearAllMocks());

  describe('notify', () => {
    it('should create notification with all fields', async () => {
      prisma.notification.create.mockResolvedValue({ id: 'n1', type: 'NEW_ORDER' });
      await service.notify('t1', 'NEW_ORDER', 'New Order', 'طلب جديد', 'Order #123', 'طلب #123', { orderId: 'o1' });
      expect(prisma.notification.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ type: 'NEW_ORDER', tenantId: 't1', title: 'New Order', titleAr: 'طلب جديد' }),
      }));
    });
  });

  describe('markAsRead', () => {
    it('should set isRead=true and readAt', async () => {
      prisma.notification.update.mockResolvedValue({ id: 'n1', isRead: true });
      await service.markAsRead('t1', 'u1', 'n1');
      expect(prisma.notification.update).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ isRead: true }),
      }));
    });
  });

  describe('markAllAsRead', () => {
    it('should update all unread notifications for user', async () => {
      prisma.notification.updateMany.mockResolvedValue({ count: 5 });
      await service.markAllAsRead('t1', 'u1');
      expect(prisma.notification.updateMany).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({ tenantId: 't1', userId: 'u1', isRead: false }),
      }));
    });
  });

  describe('findAll', () => {
    it('should filter unread only', async () => {
      prisma.notification.findMany.mockResolvedValue([]);
      prisma.notification.count.mockResolvedValue(0);
      await service.findAll('t1', 'u1', { unreadOnly: true });
      const call = prisma.notification.findMany.mock.calls[0][0];
      expect(call.where.isRead).toBe(false);
    });
  });
});
