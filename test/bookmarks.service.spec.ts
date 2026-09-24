import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../src/database/prisma.service';
import { BookmarksService } from '../src/modules/bookmarks/bookmarks.service';

describe('BookmarksService', () => {
  let service: BookmarksService;

  const mockPrismaService = {
    dua: {
      findUnique: jest.fn(),
    },
    savedDua: {
      findUnique: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookmarksService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<BookmarksService>(BookmarksService);
    jest.clearAllMocks();
  });

  describe('saveDua', () => {
    it('should save a Dua for a user successfully', async () => {
      mockPrismaService.dua.findUnique.mockResolvedValue({ id: 'dua-1' });
      mockPrismaService.savedDua.findUnique.mockResolvedValue(null);
      mockPrismaService.savedDua.create.mockResolvedValue({
        id: 'save-1',
        userId: 'user-1',
        duaId: 'dua-1',
        dua: { id: 'dua-1', title: 'ঘুমানোর দোয়া' },
      });

      const result = await service.saveDua('user-1', 'dua-1');
      expect(result.message).toContain('saved successfully');
      expect(mockPrismaService.savedDua.create).toHaveBeenCalledWith({
        data: { userId: 'user-1', duaId: 'dua-1' },
        include: { dua: { include: { category: true } } },
      });
    });

    it('should throw ConflictException if Dua is already saved (duplicate prevention)', async () => {
      mockPrismaService.dua.findUnique.mockResolvedValue({ id: 'dua-1' });
      mockPrismaService.savedDua.findUnique.mockResolvedValue({ id: 'existing-save' });

      await expect(service.saveDua('user-1', 'dua-1')).rejects.toThrow(
        ConflictException,
      );
    });

    it('should throw NotFoundException if Dua does not exist', async () => {
      mockPrismaService.dua.findUnique.mockResolvedValue(null);

      await expect(service.saveDua('user-1', 'invalid-dua')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('unsaveDua', () => {
    it('should remove Dua from saved list', async () => {
      mockPrismaService.savedDua.findUnique.mockResolvedValue({ id: 'save-1' });
      mockPrismaService.savedDua.delete.mockResolvedValue({});

      const result = await service.unsaveDua('user-1', 'dua-1');
      expect(result.message).toContain('removed');
    });

    it('should throw NotFoundException if not in saved list', async () => {
      mockPrismaService.savedDua.findUnique.mockResolvedValue(null);

      await expect(service.unsaveDua('user-1', 'dua-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getSavedDuas', () => {
    it('should return paginated saved duas for user', async () => {
      mockPrismaService.savedDua.count.mockResolvedValue(1);
      mockPrismaService.savedDua.findMany.mockResolvedValue([
        {
          id: 'save-1',
          savedAt: new Date(),
          dua: { id: 'dua-1', title: 'ঘুমানোর দোয়া' },
        },
      ]);

      const result = await service.getSavedDuas('user-1', { page: 1, limit: 10 });
      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(result.data[0].isSaved).toBe(true);
    });
  });
});
