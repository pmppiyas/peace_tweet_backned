import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { DuaAudiosService } from './dua-audios.service';
import { PrismaService } from '../../database/prisma.service';
import { CacheService } from '../../cache/cache.service';
import { KafkaProducerService } from '../../kafka/kafka-producer.service';
import { KAFKA_TOPIC_DUA_AUDIO_REQUESTED } from '../../kafka/events/dua-audio-requested.event';

describe('DuaAudiosService', () => {
  let service: DuaAudiosService;
  let prismaMock: any;
  let cacheMock: any;
  let kafkaProducerMock: any;

  beforeEach(async () => {
    prismaMock = {
      dua: {
        findUnique: jest.fn(),
      },
      duaAudio: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    cacheMock = {
      delPattern: jest.fn().mockResolvedValue(undefined),
    };

    kafkaProducerMock = {
      emit: jest.fn().mockResolvedValue(undefined),
      registerLocalListener: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DuaAudiosService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: CacheService, useValue: cacheMock },
        { provide: KafkaProducerService, useValue: kafkaProducerMock },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue('localhost:9092') },
        },
      ],
    }).compile();

    service = module.get<DuaAudiosService>(DuaAudiosService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should enqueue video extraction job to Kafka', async () => {
    prismaMock.dua.findUnique.mockResolvedValue({ id: 'dua-123', title: 'Test Dua' });

    const mockFile: any = {
      path: 'uploads/videos/video_test.mp4',
      originalname: 'recitation.mp4',
    };

    const result = await service.requestVideoAudioExtraction('dua-123', mockFile, {
      reciterName: 'Sheikh Mishary',
      language: 'ar',
    });

    expect(result.success).toBe(true);
    expect(result.status).toBe('PROCESSING');
    expect(kafkaProducerMock.emit).toHaveBeenCalledWith(
      KAFKA_TOPIC_DUA_AUDIO_REQUESTED,
      'dua-123',
      expect.objectContaining({
        duaId: 'dua-123',
        reciterName: 'Sheikh Mishary',
      }),
    );
  });

  it('should save DuaAudio when DuaAudioProcessed event is COMPLETED', async () => {
    prismaMock.duaAudio.create.mockResolvedValue({
      id: 'audio-1',
      duaId: 'dua-123',
      audioUrl: '/uploads/audios/audio_123.mp3',
      duration: 50,
      reciterName: 'Sheikh Mishary',
    });

    await service.handleAudioProcessed({
      jobId: 'job-1',
      duaId: 'dua-123',
      audioUrl: '/uploads/audios/audio_123.mp3',
      audioPath: 'uploads/audios/audio_123.mp3',
      duration: 50,
      reciterName: 'Sheikh Mishary',
      language: 'ar',
      status: 'COMPLETED',
      timestamp: new Date().toISOString(),
    });

    expect(prismaMock.duaAudio.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        duaId: 'dua-123',
        audioUrl: '/uploads/audios/audio_123.mp3',
        duration: 50,
        reciterName: 'Sheikh Mishary',
        verified: true,
      }),
    });
    expect(cacheMock.delPattern).toHaveBeenCalledWith('categories:*');
  });
});
