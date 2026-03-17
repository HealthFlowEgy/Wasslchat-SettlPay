import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { UsersService } from '../../src/modules/users/users.service';
import { PrismaService } from '../../src/common/prisma/prisma.service';

describe('UsersService', () => {
  let service: UsersService;
  let prisma: any;

  const mockPrisma = {
    user: { findMany: jest.fn(), findFirst: jest.fn(), create: jest.fn(), update: jest.fn(), count: jest.fn() },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UsersService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();
    service = module.get(UsersService);
    prisma = module.get(PrismaService);
  });
  afterEach(() => jest.clearAllMocks());

  describe('findAll', () => {
    it('should return paginated users without password hash', async () => {
      prisma.user.findMany.mockResolvedValue([{ id: 'u1', email: 'a@b.com', firstName: 'A' }]);
      prisma.user.count.mockResolvedValue(1);
      const result = await service.findAll('t1');
      expect(result.data).toHaveLength(1);
      // Verify select doesn't include passwordHash
      const call = prisma.user.findMany.mock.calls[0][0];
      expect(call.select).toBeDefined();
      expect(call.select.passwordHash).toBeUndefined();
    });
  });

  describe('create', () => {
    it('should throw if email already exists', async () => {
      prisma.user.findFirst.mockResolvedValue({ id: 'u1' });
      await expect(service.create('t1', { email: 'dup@test.com', password: 'p', firstName: 'A', lastName: 'B' })).rejects.toThrow(ConflictException);
    });

    it('should hash password and create user', async () => {
      prisma.user.findFirst.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({ id: 'u1', email: 'new@test.com', role: 'AGENT' });
      const result = await service.create('t1', { email: 'new@test.com', password: 'Test1234!', firstName: 'A', lastName: 'B' });
      const createCall = prisma.user.create.mock.calls[0][0];
      // Password should be hashed, not plain
      expect(createCall.data.passwordHash).toBeDefined();
      expect(createCall.data.passwordHash).not.toBe('Test1234!');
    });
  });

  describe('delete', () => {
    it('should soft-deactivate user', async () => {
      prisma.user.findFirst.mockResolvedValue({ id: 'u1' });
      prisma.user.update.mockResolvedValue({ id: 'u1', isActive: false });
      await service.delete('t1', 'u1');
      expect(prisma.user.update).toHaveBeenCalledWith(expect.objectContaining({ data: { isActive: false } }));
    });
  });
});
