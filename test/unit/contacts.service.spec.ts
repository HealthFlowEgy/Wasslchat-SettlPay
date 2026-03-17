import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ContactsService } from '../../src/modules/contacts/contacts.service';
import { PrismaService } from '../../src/common/prisma/prisma.service';

describe('ContactsService', () => {
  let service: ContactsService;
  let prisma: any;

  const mockPrisma = {
    contact: { findMany: jest.fn(), findFirst: jest.fn(), create: jest.fn(), update: jest.fn(), count: jest.fn() },
    order: { updateMany: jest.fn() },
    conversation: { updateMany: jest.fn(), findFirst: jest.fn(), create: jest.fn() },
    contactTag: { create: jest.fn(), deleteMany: jest.fn(), updateMany: jest.fn() },
    $transaction: jest.fn((fns) => Promise.all(fns)),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ContactsService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();
    service = module.get(ContactsService);
    prisma = module.get(PrismaService);
  });
  afterEach(() => jest.clearAllMocks());

  describe('findOrCreateByPhone', () => {
    it('should return existing contact if phone matches', async () => {
      prisma.contact.findFirst.mockResolvedValue({ id: 'c1', phone: '01012345678' });
      const result = await service.findOrCreateByPhone('t1', '01012345678');
      expect(result.id).toBe('c1');
      expect(prisma.contact.create).not.toHaveBeenCalled();
    });

    it('should create new contact if phone not found', async () => {
      prisma.contact.findFirst.mockResolvedValue(null);
      prisma.contact.create.mockResolvedValue({ id: 'c-new', phone: '01098765432' });
      const result = await service.findOrCreateByPhone('t1', '01098765432', { name: 'New Customer' });
      expect(prisma.contact.create).toHaveBeenCalled();
    });
  });

  describe('merge', () => {
    it('should throw if primary not found', async () => {
      prisma.contact.findFirst.mockResolvedValueOnce(null);
      await expect(service.merge('t1', 'bad', 'c2')).rejects.toThrow(NotFoundException);
    });

    it('should throw if secondary not found', async () => {
      prisma.contact.findFirst.mockResolvedValueOnce({ id: 'c1', totalOrders: 5, totalSpent: 1000 });
      prisma.contact.findFirst.mockResolvedValueOnce(null);
      await expect(service.merge('t1', 'c1', 'bad')).rejects.toThrow(NotFoundException);
    });

    it('should merge stats and move orders/conversations', async () => {
      prisma.contact.findFirst.mockResolvedValueOnce({ id: 'c1', phone: '0101', totalOrders: 5, totalSpent: 1000, name: 'Ahmed' });
      prisma.contact.findFirst.mockResolvedValueOnce({ id: 'c2', phone: '0102', totalOrders: 3, totalSpent: 600, name: null, email: 'a@b.com' });
      prisma.contact.findFirst.mockResolvedValue({ id: 'c1' }); // final fetch
      prisma.contact.update.mockResolvedValue({});
      prisma.order.updateMany.mockResolvedValue({});
      prisma.conversation.updateMany.mockResolvedValue({});
      prisma.contactTag.updateMany.mockResolvedValue({});

      await service.merge('t1', 'c1', 'c2');
      // Should have merged stats: 5+3=8 orders, 1000+600=1600 spent
      expect(prisma.$transaction).toHaveBeenCalled();
    });
  });

  describe('findDuplicates', () => {
    it('should find contacts with matching last 10 phone digits', async () => {
      prisma.contact.findMany.mockResolvedValue([
        { id: 'c1', name: 'Ahmed', phone: '+201012345678', email: null, totalOrders: 5 },
        { id: 'c2', name: 'Ahmed M', phone: '01012345678', email: null, totalOrders: 2 },
        { id: 'c3', name: 'Sara', phone: '01099999999', email: null, totalOrders: 1 },
      ]);
      const dupes = await service.findDuplicates('t1');
      expect(dupes.length).toBe(1);
      expect(dupes[0].reason).toContain('هاتف');
    });

    it('should find contacts with matching email', async () => {
      prisma.contact.findMany.mockResolvedValue([
        { id: 'c1', name: 'A', phone: '0101', email: 'same@test.com', totalOrders: 1 },
        { id: 'c2', name: 'B', phone: '0102', email: 'same@test.com', totalOrders: 1 },
      ]);
      const dupes = await service.findDuplicates('t1');
      expect(dupes.length).toBe(1);
      expect(dupes[0].reason).toContain('بريد');
    });
  });

  describe('block/unblock', () => {
    it('should block a contact', async () => {
      prisma.contact.findFirst.mockResolvedValue({ id: 'c1' });
      prisma.contact.update.mockResolvedValue({ id: 'c1', isBlocked: true });
      const result = await service.block('t1', 'c1');
      expect(prisma.contact.update).toHaveBeenCalledWith(expect.objectContaining({ data: { isBlocked: true } }));
    });
  });

  describe('importFromCsv', () => {
    it('should parse CSV and create contacts', async () => {
      prisma.contact.findFirst.mockResolvedValue(null);
      prisma.contact.create.mockResolvedValue({ id: 'c1' });
      const csv = 'phone,name\n01012345678,Ahmed\n01098765432,Sara';
      const result = await service.importFromCsv('t1', csv);
      expect(result.imported).toBe(2);
    });
  });
});
