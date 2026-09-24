import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../src/database/prisma.service';
import { DuaReferencesService } from '../src/modules/dua-references/dua-references.service';

describe('DuaReferencesService', () => {
  let service: DuaReferencesService;

  const mockPrismaService = {
    dua: { findUnique: jest.fn() },
    source: { findUnique: jest.fn() },
    duaReference: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DuaReferencesService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<DuaReferencesService>(DuaReferencesService);
    jest.clearAllMocks();
  });

  it('should add reference to a Dua', async () => {
    mockPrismaService.dua.findUnique.mockResolvedValue({ id: 'dua-1' });
    mockPrismaService.source.findUnique.mockResolvedValue({ id: 'src-1' });
    mockPrismaService.duaReference.create.mockResolvedValue({
      id: 'ref-1',
      duaId: 'dua-1',
      sourceId: 'src-1',
      reference: '6324',
    });

    const result = await service.create('dua-1', {
      sourceId: 'src-1',
      reference: '6324',
      note: 'Sahih Bukhari',
    });

    expect(result.id).toBe('ref-1');
  });

  it('should throw NotFoundException if Dua does not exist', async () => {
    mockPrismaService.dua.findUnique.mockResolvedValue(null);

    await expect(
      service.create('invalid-dua', {
        sourceId: 'src-1',
        reference: '6324',
      }),
    ).rejects.toThrow(NotFoundException);
  });
});
