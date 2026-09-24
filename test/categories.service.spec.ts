import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../src/database/prisma.service';
import { CategoriesService } from '../src/modules/categories/categories.service';

describe('CategoriesService', () => {
  let service: CategoriesService;

  const mockPrismaService = {
    category: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      count: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    dua: {
      count: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoriesService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<CategoriesService>(CategoriesService);
    jest.clearAllMocks();
  });

  it('should create a category', async () => {
    mockPrismaService.category.findUnique.mockResolvedValue(null);
    mockPrismaService.category.create.mockResolvedValue({
      id: 'cat-1',
      name: 'নামাজ',
      slug: 'prayer',
    });

    const result = await service.create({
      name: 'নামাজ',
      slug: 'prayer',
      description: 'নামাজের দোয়া',
    });

    expect(result.id).toBe('cat-1');
  });

  it('should throw ConflictException on duplicate category slug', async () => {
    mockPrismaService.category.findUnique.mockResolvedValue({ id: 'existing' });

    await expect(
      service.create({
        name: 'নামাজ',
        slug: 'prayer',
      }),
    ).rejects.toThrow(ConflictException);
  });
});
