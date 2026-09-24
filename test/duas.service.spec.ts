import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { DuaStatus } from '../src/common/enums/dua-status.enum';
import { Role } from '../src/common/enums/role.enum';
import { PrismaService } from '../src/database/prisma.service';
import { DuasService } from '../src/modules/duas/duas.service';

describe('DuasService', () => {
  let service: DuasService;

  const mockPrismaService = {
    category: {
      findUnique: jest.fn(),
    },
    dua: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    savedDua: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DuasService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<DuasService>(DuasService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new Dua when category exists', async () => {
      mockPrismaService.category.findUnique.mockResolvedValue({ id: 'cat-1' });
      mockPrismaService.dua.create.mockResolvedValue({
        id: 'dua-1',
        title: 'ঘুমানোর দোয়া',
        status: DuaStatus.PUBLISHED,
      });

      const result = await service.create(
        {
          title: 'ঘুমানোর দোয়া',
          fadilah: 'রাসূল (সা.) পড়তেন',
          duaBangla: 'বিসমিকা আল্লাহুম্মা...',
          meaningBangla: 'হে আল্লাহ আপনার নামে নিদ্রা যাই',
          categoryId: 'cat-1',
          status: DuaStatus.PUBLISHED,
        },
        'user-admin-1',
      );

      expect(result.id).toBe('dua-1');
      expect(mockPrismaService.dua.create).toHaveBeenCalled();
    });

    it('should throw BadRequestException if category does not exist', async () => {
      mockPrismaService.category.findUnique.mockResolvedValue(null);

      await expect(
        service.create(
          {
            title: 'ঘুমানোর দোয়া',
            fadilah: 'রাসূল (সা.) পড়তেন',
            duaBangla: 'বিসমিকা আল্লাহুম্মা...',
            meaningBangla: 'হে আল্লাহ আপনার নামে নিদ্রা যাই',
            categoryId: 'non-existent-cat',
          },
          'user-admin-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findOne', () => {
    it('should return published Dua by ID', async () => {
      mockPrismaService.dua.findUnique.mockResolvedValue({
        id: 'dua-1',
        title: 'ঘুমানোর দোয়া',
        status: DuaStatus.PUBLISHED,
      });

      const result = await service.findOne('dua-1');
      expect(result.id).toBe('dua-1');
      expect(result.isSaved).toBe(false);
    });

    it('should throw NotFoundException if Dua is draft and user is not admin', async () => {
      mockPrismaService.dua.findUnique.mockResolvedValue({
        id: 'dua-draft-1',
        title: 'খসড়া দোয়া',
        status: DuaStatus.DRAFT,
      });

      await expect(
        service.findOne('dua-draft-1', {
          id: 'user-1',
          email: 'u@test.com',
          username: 'user1',
          role: Role.USER,
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should delete Dua by ID', async () => {
      mockPrismaService.dua.findUnique.mockResolvedValue({
        id: 'dua-1',
        title: 'Title',
      });
      mockPrismaService.dua.delete.mockResolvedValue({});

      const result = await service.remove('dua-1');
      expect(result.message).toContain('deleted successfully');
    });
  });
});
