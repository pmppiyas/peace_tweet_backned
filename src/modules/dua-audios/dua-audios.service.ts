import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Consumer, Kafka, logLevel } from 'kafkajs';
import { CacheService } from '../../cache/cache.service';
import { PrismaService } from '../../database/prisma.service';
import {
  DuaAudioProcessedEvent,
  KAFKA_TOPIC_DUA_AUDIO_PROCESSED,
} from '../../kafka/events/dua-audio-processed.event';
import {
  DuaAudioRequestedEvent,
  KAFKA_TOPIC_DUA_AUDIO_REQUESTED,
} from '../../kafka/events/dua-audio-requested.event';
import { KafkaProducerService } from '../../kafka/kafka-producer.service';
import { CreateDuaAudioDto } from './dto/create-dua-audio.dto';
import { UpdateDuaAudioDto } from './dto/update-dua-audio.dto';
import { UploadVideoDto } from './dto/upload-video.dto';

@Injectable()
export class DuaAudiosService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DuaAudiosService.name);
  private kafka: Kafka | null = null;
  private consumer: Consumer | null = null;
  private isConnected = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
    private readonly kafkaProducer: KafkaProducerService,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit() {
    // 1. Register local fallback listener for processed events
    this.kafkaProducer.registerLocalListener(
      KAFKA_TOPIC_DUA_AUDIO_PROCESSED,
      async (topic, key, payload: DuaAudioProcessedEvent) => {
        await this.handleAudioProcessed(payload);
      },
    );

    // 2. Initialize Kafka Consumer for processed events
    await this.initKafkaProcessedConsumer();
  }

  async onModuleDestroy() {
    if (this.consumer && this.isConnected) {
      try {
        await this.consumer.disconnect();
        this.logger.log('DuaAudios Kafka processed consumer disconnected.');
      } catch (err: any) {
        this.logger.warn(`Error disconnecting Kafka processed consumer: ${err.message}`);
      }
    }
  }

  private async initKafkaProcessedConsumer(): Promise<void> {
    const brokers =
      this.configService.get<string[]>('kafka.brokers') ||
      (process.env.KAFKA_BROKERS ? process.env.KAFKA_BROKERS.split(',') : ['localhost:9092']);
    const groupId =
      this.configService.get<string>('kafka.groupId') ||
      process.env.KAFKA_GROUP_ID ||
      'peacetweet-dua-audio-handler-group';

    try {
      this.kafka = new Kafka({
        clientId: 'peacetweet-dua-audio-handler',
        brokers,
        logLevel: logLevel.WARN,
      });

      this.consumer = this.kafka.consumer({ groupId: `${groupId}-processed` });
      await this.consumer.connect();
      await this.consumer.subscribe({
        topic: KAFKA_TOPIC_DUA_AUDIO_PROCESSED,
        fromBeginning: false,
      });

      this.isConnected = true;
      this.logger.log(
        `🎧 DuaAudios Consumer connected & listening on topic '${KAFKA_TOPIC_DUA_AUDIO_PROCESSED}'`,
      );

      await this.consumer.run({
        eachMessage: async ({ topic, partition, message }) => {
          if (!message.value) return;
          try {
            const event: DuaAudioProcessedEvent = JSON.parse(
              message.value.toString(),
            );
            await this.handleAudioProcessed(event);
          } catch (err: any) {
            this.logger.error(
              `Error handling DuaAudioProcessed event: ${err.message}`,
              err.stack,
            );
          }
        },
      });
    } catch (error: any) {
      this.isConnected = false;
      this.logger.warn(
        `⚠️ Kafka consumer init notice in DuaAudiosService: ${error.message}. (Local dispatcher active)`,
      );
    }
  }

  // Enqueue video file for asynchronous audio extraction via Kafka
  async requestVideoAudioExtraction(
    duaId: string,
    file: Express.Multer.File,
    dto: UploadVideoDto,
    requestedBy?: string,
  ) {
    if (!file) {
      throw new BadRequestException('Video file is required.');
    }

    const dua = await this.prisma.dua.findUnique({
      where: { id: duaId },
    });
    if (!dua) {
      throw new NotFoundException(`Dua with ID '${duaId}' not found.`);
    }

    const jobId = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    const event: DuaAudioRequestedEvent = {
      jobId,
      duaId,
      videoPath: file.path,
      originalFilename: file.originalname,
      reciterName: dto.reciterName?.trim() || 'Islamic Reciter',
      language: dto.language?.trim() || 'ar',
      requestedBy,
      timestamp: new Date().toISOString(),
    };

    // Emit event to Kafka topic
    await this.kafkaProducer.emit(
      KAFKA_TOPIC_DUA_AUDIO_REQUESTED,
      duaId,
      event,
    );

    this.logger.log(
      `🚀 Enqueued Video-to-Audio Extraction Job '${jobId}' for Dua '${duaId}'`,
    );

    return {
      success: true,
      jobId,
      duaId,
      status: 'PROCESSING',
      message:
        'Video uploaded successfully. Audio extraction job has been dispatched to Kafka.',
      estimatedOutput: `/uploads/audios/audio_${jobId}.mp3`,
    };
  }

  // Handle completion of audio extraction from Kafka worker
  async handleAudioProcessed(event: DuaAudioProcessedEvent) {

    const { jobId, duaId, audioUrl, duration, reciterName, language, status, error } = event;

    if (status === 'COMPLETED') {
      this.logger.log(
        `💾 [Database] Saving extracted audio for Dua '${duaId}' (Job '${jobId}')`,
      );

      const createdAudio = await this.prisma.duaAudio.create({
        data: {
          duaId,
          audioUrl,
          duration: duration || null,
          reciterName: reciterName || null,
          language: language || 'ar',
          verified: true,
        },
      });

      await this.cache.delPattern('categories:*');
      this.logger.log(
        `🎉 [Database] Successfully stored DuaAudio '${createdAudio.id}' for Dua '${duaId}'!`,
      );
      return createdAudio;
    } else {
      this.logger.error(
        `❌ [Audio Extraction Failed] Job '${jobId}' for Dua '${duaId}' failed: ${error}`,
      );
    }
  }

  async create(duaId: string, dto: CreateDuaAudioDto) {
    const dua = await this.prisma.dua.findUnique({
      where: { id: duaId },
    });
    if (!dua) {
      throw new NotFoundException(`Dua with ID '${duaId}' not found.`);
    }

    const created = await this.prisma.duaAudio.create({
      data: {
        duaId,
        audioUrl: dto.audioUrl.trim(),
        reciterName: dto.reciterName?.trim(),
        duration: dto.duration,
        language: dto.language?.trim(),
        verified: dto.verified ?? false,
      },
    });

    await this.cache.delPattern('categories:*');
    return created;
  }

  async findAllByDuaId(duaId: string) {
    const dua = await this.prisma.dua.findUnique({
      where: { id: duaId },
    });
    if (!dua) {
      throw new NotFoundException(`Dua with ID '${duaId}' not found.`);
    }

    return this.prisma.duaAudio.findMany({
      where: { duaId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async update(duaId: string, audioId: string, dto: UpdateDuaAudioDto) {
    const audio = await this.prisma.duaAudio.findFirst({
      where: { id: audioId, duaId },
    });
    if (!audio) {
      throw new NotFoundException(
        `Audio with ID '${audioId}' for Dua '${duaId}' not found.`,
      );
    }

    const updated = await this.prisma.duaAudio.update({
      where: { id: audioId },
      data: {
        ...(dto.audioUrl && { audioUrl: dto.audioUrl.trim() }),
        ...(dto.reciterName !== undefined && { reciterName: dto.reciterName?.trim() }),
        ...(dto.duration !== undefined && { duration: dto.duration }),
        ...(dto.language !== undefined && { language: dto.language?.trim() }),
        ...(dto.verified !== undefined && { verified: dto.verified }),
      },
    });

    await this.cache.delPattern('categories:*');
    return updated;
  }

  async remove(duaId: string, audioId: string) {
    const audio = await this.prisma.duaAudio.findFirst({
      where: { id: audioId, duaId },
    });
    if (!audio) {
      throw new NotFoundException(
        `Audio with ID '${audioId}' for Dua '${duaId}' not found.`,
      );
    }

    await this.prisma.duaAudio.delete({
      where: { id: audioId },
    });

    await this.cache.delPattern('categories:*');
    return { message: 'Dua audio recording deleted successfully.' };
  }
}
