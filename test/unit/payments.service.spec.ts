import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { PaymentsService } from '../../src/modules/payments/payments.service';
import { PrismaService } from '../../src/common/prisma/prisma.service';
import { ConfigService } from '@nestjs/config';

describe('PaymentsService', () => {
  let service: PaymentsService;
  let prisma: any;

  const mockPrisma = {
    order: { findFirst: jest.fn(), update: jest.fn() },
    paymentTransaction: { create: jest.fn(), findFirst: jest.fn(), findMany: jest.fn(), count: jest.fn(), update: jest.fn() },
  };
  const mockConfig = { get: jest.fn().mockReturnValue('test') };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();
    service = module.get(PaymentsService);
    prisma = module.get(PrismaService);
  });
  afterEach(() => jest.clearAllMocks());

  describe('initiatePayment', () => {
    it('should throw if order not found', async () => {
      prisma.order.findFirst.mockResolvedValue(null);
      await expect(service.initiatePayment('t1', 'bad', 'FAWRY')).rejects.toThrow(NotFoundException);
    });

    it('should throw if order already paid', async () => {
      prisma.order.findFirst.mockResolvedValue({ id: 'o1', paymentStatus: 'COMPLETED' });
      await expect(service.initiatePayment('t1', 'o1', 'FAWRY')).rejects.toThrow(BadRequestException);
    });

    it('should create pending transaction for valid order', async () => {
      prisma.order.findFirst.mockResolvedValue({ id: 'o1', total: 500, paymentStatus: 'PENDING', tenantId: 't1' });
      prisma.paymentTransaction.create.mockResolvedValue({ id: 'tx1', status: 'PENDING' });
      const result = await service.initiatePayment('t1', 'o1', 'FAWRY');
      expect(prisma.paymentTransaction.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ method: 'FAWRY', status: 'PENDING', amount: 500 }),
      }));
    });
  });

  describe('handleWebhook', () => {
    it('should return null if transaction not found', async () => {
      prisma.paymentTransaction.findFirst.mockResolvedValue(null);
      const result = await service.handleWebhook('t1', 'healthpay', { transactionId: 'bad' });
      expect(result).toBeNull();
    });

    it('should complete payment and update order on success', async () => {
      prisma.paymentTransaction.findFirst.mockResolvedValue({ id: 'tx1', orderId: 'o1', tenantId: 't1' });
      prisma.paymentTransaction.update.mockResolvedValue({ id: 'tx1', status: 'COMPLETED' });
      prisma.order.update.mockResolvedValue({ id: 'o1', status: 'CONFIRMED' });
      const result = await service.handleWebhook('t1', 'healthpay', { transactionId: 'tx-hp', status: 'PAID' });
      expect(prisma.order.update).toHaveBeenCalled();
    });
  });

  describe('refund', () => {
    it('should throw if transaction not found', async () => {
      prisma.paymentTransaction.findFirst.mockResolvedValue(null);
      await expect(service.refund('t1', 'bad-tx')).rejects.toThrow(NotFoundException);
    });

    it('should throw if not completed', async () => {
      prisma.paymentTransaction.findFirst.mockResolvedValue({ id: 'tx1', status: 'PENDING' });
      await expect(service.refund('t1', 'tx1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('listPayments', () => {
    it('should return paginated results', async () => {
      prisma.paymentTransaction.findMany.mockResolvedValue([{ id: 'tx1' }]);
      prisma.paymentTransaction.count.mockResolvedValue(1);
      const result = await service.listPayments('t1', { page: 1, limit: 10 });
      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });
  });
});
