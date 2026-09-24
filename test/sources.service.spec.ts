import { ConflictException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { SourceType } from '../src/common/enums/source-type.enum';
import { PrismaService } from '../src/database/prisma.service';
import { SourcesService } from '../src/modules/sources/sources.service';

describe('SourcesService', () => {
  let service: SourcesService;

  const mockPrismaService = {
    source: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      count: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    duaReference: {
      count: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SourcesService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<SourcesService>(SourcesService);
    jest.clearAllMocks();
  });

  it('should create a new source', async () => {
    mockPrismaService.source.findFirst.mockResolvedValue(null);
    mockPrismaService.source.create.mockResolvedValue({
      id: 'src-1',
      name: 'Sahih al-Bukhari',
      type: SourceType.HADITH,
    });

    const result = await service.create({
      name: 'Sahih al-Bukhari',
      type: SourceType.HADITH,
      description: 'Hadith book',
    });

    expect(result.id).toBe('src-1');
  });

  it('should throw ConflictException on duplicate source name', async () => {
    mockPrismaService.source.findFirst.mockResolvedValue({ id: 'existing' });

    await expect(
      service.create({
        name: 'Sahih al-Bukhari',
        type: SourceType.HADITH,
      }),
    ).rejects.toThrow(ConflictException);
  });
});
