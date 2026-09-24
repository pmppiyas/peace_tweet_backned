import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Role } from '../src/common/enums/role.enum';
import { PrismaService } from '../src/database/prisma.service';
import { UsersService } from '../src/modules/users/users.service';

describe('UsersService', () => {
  let service: UsersService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    jest.clearAllMocks();
  });

  it('should find user profile by ID without passwordHash', async () => {
    mockPrismaService.user.findUnique.mockResolvedValue({
      id: 'user-1',
      name: 'Abdullah',
      username: 'abdullah',
      email: 'abdullah@example.com',
      role: Role.USER,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await service.findById('user-1');
    expect(result.username).toBe('abdullah');
    expect(result).not.toHaveProperty('passwordHash');
  });

  it('should throw NotFoundException if user not found', async () => {
    mockPrismaService.user.findUnique.mockResolvedValue(null);

    await expect(service.findById('non-existing')).rejects.toThrow(
      NotFoundException,
    );
  });
});
