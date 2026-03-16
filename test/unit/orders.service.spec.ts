import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { OrdersService } from '../../src/modules/orders/orders.service';
import { PrismaService } from '../../src/common/prisma/prisma.service';

describe('OrdersService', () => {
  let service: OrdersService;
  let prisma: any;

  const mockPrisma = {
    order: { findMany: jest.fn(), findFirst: jest.fn(), create: jest.fn(), update: jest.fn(), count: jest.fn(), aggregate: jest.fn() },
    contact: { findFirst: jest.fn(), update: jest.fn() },
    product: { findMany: jest.fn(), update: jest.fn() },
    orderNote: { create: jest.fn() },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [OrdersService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();
    service = module.get<OrdersService>(OrdersService);
    prisma = module.get(PrismaService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('create', () => {
    it('should throw if contact not found', async () => {
      mockPrisma.contact.findFirst.mockResolvedValue(null);
      await expect(service.create('t1', { contactId: 'bad', items: [] })).rejects.toThrow(NotFoundException);
    });

    it('should throw if product not found', async () => {
      mockPrisma.contact.findFirst.mockResolvedValue({ id: 'c1' });
      mockPrisma.product.findMany.mockResolvedValue([]);
      await expect(service.create('t1', {
        contactId: 'c1', items: [{ productId: 'bad', quantity: 1 }],
      })).rejects.toThrow(BadRequestException);
    });

    it('should create order with correct total', async () => {
      mockPrisma.contact.findFirst.mockResolvedValue({ id: 'c1' });
      mockPrisma.product.findMany.mockResolvedValue([{ id: 'p1', name: 'Test', nameAr: 'تست', sku: 'T1', price: 100 }]);
      mockPrisma.order.create.mockResolvedValue({ id: 'o1', total: 200 });
      mockPrisma.contact.update.mockResolvedValue({});
      mockPrisma.product.update.mockResolvedValue({});

      const result = await service.create('t1', {
        contactId: 'c1', items: [{ productId: 'p1', quantity: 2 }],
      });
      expect(result.total).toBe(200);
    });
  });

  describe('updateStatus', () => {
    it('should set timestamps correctly', async () => {
      mockPrisma.order.findFirst.mockResolvedValue({ id: 'o1', tenantId: 't1' });
      mockPrisma.order.update.mockResolvedValue({ id: 'o1', status: 'SHIPPED' });

      await service.updateStatus('t1', 'o1', 'SHIPPED');
      const updateCall = mockPrisma.order.update.mock.calls[0][0];
      expect(updateCall.data.shippedAt).toBeDefined();
    });
  });
});
