import { NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { CacheService } from '../src/cache/cache.service';
import { PrismaService } from '../src/database/prisma.service';
import { KafkaProducerService } from '../src/kafka/kafka-producer.service';
import { DuaAudiosService } from '../src/modules/dua-audios/dua-audios.service';

describe('DuaAudiosService', () => {
  let service: DuaAudiosService;

  const mockPrismaService = {
    dua: { findUnique: jest.fn() },
    duaAudio: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  const mockCacheService = {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(undefined),
    del: jest.fn().mockResolvedValue(undefined),
    delPattern: jest.fn().mockResolvedValue(undefined),
    remember: jest.fn((key: string, ttl: number, fetcher: () => Promise<any>) => fetcher()),
  };

  const mockKafkaProducer = {
    emit: jest.fn().mockResolvedValue(undefined),
    registerLocalListener: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DuaAudiosService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: CacheService, useValue: mockCacheService },
        { provide: KafkaProducerService, useValue: mockKafkaProducer },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue('localhost:9092') },
        },
      ],
    }).compile();

    service = module.get<DuaAudiosService>(DuaAudiosService);
    jest.clearAllMocks();
  });

  it('should add audio URL to a Dua', async () => {
    mockPrismaService.dua.findUnique.mockResolvedValue({ id: 'dua-1' });
    mockPrismaService.duaAudio.create.mockResolvedValue({
      id: 'audio-1',
      duaId: 'dua-1',
      audioUrl: 'https://audio.example.com/sleep.mp3',
      reciterName: 'Mishary Alafasy',
    });

    const result = await service.create('dua-1', {
      audioUrl: 'https://audio.example.com/sleep.mp3',
      reciterName: 'Mishary Alafasy',
      duration: 12,
    });

    expect(result.id).toBe('audio-1');
  });

  it('should throw NotFoundException if Dua not found', async () => {
    mockPrismaService.dua.findUnique.mockResolvedValue(null);

    await expect(
      service.create('invalid-dua', {
        audioUrl: 'https://audio.example.com/sleep.mp3',
      }),
    ).rejects.toThrow(NotFoundException);
  });
});
