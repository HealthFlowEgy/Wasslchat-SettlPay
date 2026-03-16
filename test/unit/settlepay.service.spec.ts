import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { SettlePayService } from '../../src/modules/settlepay/settlepay.service';
import { PrismaService } from '../../src/common/prisma/prisma.service';
import { ConfigService } from '@nestjs/config';

describe('SettlePayService', () => {
  let service: SettlePayService;
  let prisma: any;

  const mockPrisma = {
    tenant: { findUnique: jest.fn() },
    contact: { findFirst: jest.fn() },
    order: { findFirst: jest.fn(), update: jest.fn() },
    settlePayWallet: { findFirst: jest.fn(), create: jest.fn(), findMany: jest.fn() },
    paymentTransaction: { create: jest.fn() },
  };

  const mockClient = {
    loginUser: jest.fn(),
    authUser: jest.fn(),
    userWallet: jest.fn(),
    deductFromUser: jest.fn(),
    topupWalletUser: jest.fn(),
  };

  const mockEvents = {
    onPaymentCompleted: jest.fn(),
  };

  const mockConfig = { get: jest.fn().mockReturnValue('test') };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SettlePayService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: 'SettlePayClient', useValue: mockClient },
        { provide: 'EventBusService', useValue: mockEvents },
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();

    // Manual instantiation since DI might not resolve custom tokens
    service = new SettlePayService(mockPrisma as any, mockClient as any, mockEvents as any, mockConfig as any);
  });

  afterEach(() => jest.clearAllMocks());

  describe('getMerchantWallet', () => {
    it('should throw if no wallet exists', async () => {
      mockPrisma.settlePayWallet.findFirst.mockResolvedValue(null);
      await expect(service.getMerchantWallet('t1')).rejects.toThrow(NotFoundException);
    });

    it('should return wallet with live balance', async () => {
      mockPrisma.settlePayWallet.findFirst.mockResolvedValue({ id: 'w1', settlePayWalletId: 'sp1' });
      mockClient.userWallet.mockResolvedValue({ balance: 5000 });
      const result = await service.getMerchantWallet('t1');
      expect(result.balance).toBe(5000);
    });
  });

  describe('payWithWallet', () => {
    it('should throw if order not found', async () => {
      mockPrisma.order.findFirst.mockResolvedValue(null);
      await expect(service.payWithWallet('t1', 'bad-order', 'c1')).rejects.toThrow(NotFoundException);
    });

    it('should throw if order already paid', async () => {
      mockPrisma.order.findFirst.mockResolvedValue({ id: 'o1', paymentStatus: 'COMPLETED' });
      await expect(service.payWithWallet('t1', 'o1', 'c1')).rejects.toThrow(BadRequestException);
    });

    it('should throw if merchant has no wallet', async () => {
      mockPrisma.order.findFirst.mockResolvedValue({ id: 'o1', paymentStatus: 'PENDING', total: 100 });
      mockPrisma.settlePayWallet.findFirst.mockResolvedValueOnce(null);
      await expect(service.payWithWallet('t1', 'o1', 'c1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('listWallets', () => {
    it('should return wallets with balances', async () => {
      mockPrisma.settlePayWallet.findMany.mockResolvedValue([
        { id: 'w1', settlePayWalletId: 'sp1', contact: { name: 'Test' } },
      ]);
      mockClient.userWallet.mockResolvedValue({ balance: 100 });
      const result = await service.listWallets('t1');
      expect(result).toHaveLength(1);
    });
  });
});
