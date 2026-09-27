import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AudioWorkerService } from './audio-worker.service';
import { KafkaProducerService } from '../kafka/kafka-producer.service';
import { KAFKA_TOPIC_DUA_AUDIO_PROCESSED } from '../kafka/events/dua-audio-processed.event';

describe('AudioWorkerService', () => {
  let service: AudioWorkerService;
  let kafkaProducerMock: Partial<KafkaProducerService>;

  beforeEach(async () => {
    kafkaProducerMock = {
      emit: jest.fn().mockResolvedValue(undefined),
      registerLocalListener: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AudioWorkerService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('localhost:9092'),
          },
        },
        {
          provide: KafkaProducerService,
          useValue: kafkaProducerMock,
        },
      ],
    }).compile();

    service = module.get<AudioWorkerService>(AudioWorkerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should emit FAILED event when input video does not exist', async () => {
    await service.processAudioJob({
      jobId: 'test-job-1',
      duaId: 'dua-123',
      videoPath: 'non_existent_file.mp4',
      originalFilename: 'test.mp4',
      timestamp: new Date().toISOString(),
    });

    expect(kafkaProducerMock.emit).toHaveBeenCalledWith(
      KAFKA_TOPIC_DUA_AUDIO_PROCESSED,
      'dua-123',
      expect.objectContaining({
        jobId: 'test-job-1',
        duaId: 'dua-123',
        status: 'FAILED',
      }),
    );
  });
});
