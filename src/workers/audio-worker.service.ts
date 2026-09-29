import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import * as ffprobeInstaller from '@ffprobe-installer/ffprobe';
import ffmpeg from 'fluent-ffmpeg';
import * as fs from 'fs';
import { Consumer, Kafka, logLevel } from 'kafkajs';
import { join } from 'path';
import {
  DuaAudioProcessedEvent,
  KAFKA_TOPIC_DUA_AUDIO_PROCESSED,
} from '../kafka/events/dua-audio-processed.event';
import {
  DuaAudioRequestedEvent,
  KAFKA_TOPIC_DUA_AUDIO_REQUESTED,
} from '../kafka/events/dua-audio-requested.event';
import { KafkaProducerService } from '../kafka/kafka-producer.service';

@Injectable()
export class AudioWorkerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AudioWorkerService.name);
  private kafka: Kafka | null = null;
  private consumer: Consumer | null = null;
  private isConnected = false;

  constructor(
    private readonly configService: ConfigService,
    private readonly kafkaProducer: KafkaProducerService,
  ) {
    // Configure ffmpeg & ffprobe paths from static installer binaries
    if (ffmpegInstaller.path) {
      ffmpeg.setFfmpegPath(ffmpegInstaller.path);
    }
    if (ffprobeInstaller.path) {
      ffmpeg.setFfprobePath(ffprobeInstaller.path);
    }
  }

  async onModuleInit() {
    // Register local fallback listener in case Kafka is running in-memory
    this.kafkaProducer.registerLocalListener(
      KAFKA_TOPIC_DUA_AUDIO_REQUESTED,
      async (topic, key, payload: DuaAudioRequestedEvent) => {
        await this.processAudioJob(payload);
      },
    );

    // Initialize Kafka Consumer
    await this.initKafkaConsumer();
  }

  async onModuleDestroy() {
    if (this.consumer && this.isConnected) {
      try {
        await this.consumer.disconnect();
        this.logger.log('Kafka audio worker consumer disconnected.');
      } catch (err: any) {
        this.logger.warn(`Error disconnecting Kafka consumer: ${err.message}`);
      }
    }
  }

  private async initKafkaConsumer(): Promise<void> {
    const brokers =
      this.configService.get<string[]>('kafka.brokers') ||
      (process.env.KAFKA_BROKERS ? process.env.KAFKA_BROKERS.split(',') : ['localhost:9092']);
    const groupId =
      this.configService.get<string>('kafka.groupId') ||
      process.env.KAFKA_GROUP_ID ||
      'peacetweet-audio-worker-group';

    try {
      this.kafka = new Kafka({
        clientId: 'peacetweet-audio-worker',
        brokers,
        logLevel: logLevel.WARN,
      });

      this.consumer = this.kafka.consumer({ groupId });
      await this.consumer.connect();
      await this.consumer.subscribe({
        topic: KAFKA_TOPIC_DUA_AUDIO_REQUESTED,
        fromBeginning: false,
      });

      this.isConnected = true;
      this.logger.log(
        `🎧 Audio Worker Kafka Consumer connected & listening on topic '${KAFKA_TOPIC_DUA_AUDIO_REQUESTED}'`,
      );

      await this.consumer.run({
        eachMessage: async ({ topic, partition, message }) => {
          if (!message.value) return;
          try {
            const event: DuaAudioRequestedEvent = JSON.parse(message.value.toString());
            this.logger.log(
              `📥 [Worker] Received DuaAudioRequested job '${event.jobId}' for Dua '${event.duaId}'`,
            );
            await this.processAudioJob(event);
          } catch (err: any) {
            this.logger.error(
              `Error parsing or processing Kafka message: ${err.message}`,
              err.stack,
            );
          }
        },
      });
    } catch (error: any) {
      this.isConnected = false;
      this.logger.warn(
        `⚠️ Kafka consumer init notice: ${error.message}. (Local event dispatcher is handling jobs)`,
      );
    }
  }

  // Core Audio Extraction using FFmpeg
  async processAudioJob(event: DuaAudioRequestedEvent): Promise<void> {
    const { jobId, duaId, videoPath, reciterName, language } = event;
    const startTime = Date.now();

    this.logger.log(
      `🎬 [FFmpeg Worker] Starting audio extraction for Job '${jobId}' from: ${videoPath}`,
    );

    const uploadsDir = join(process.cwd(), 'uploads', 'audios');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const outputFilename = `audio_${jobId}.mp3`;
    const outputPath = join(uploadsDir, outputFilename);
    const audioUrl = `/uploads/audios/${outputFilename}`;

    try {
      if (!fs.existsSync(videoPath)) {
        throw new Error(`Input video file not found at path: ${videoPath}`);
      }

      // 1. Extract audio track to high-quality MP3 using FFmpeg
      await this.extractAudioWithFFmpeg(videoPath, outputPath);

      // 2. Probe duration with FFprobe
      const durationSeconds = await this.probeAudioDuration(outputPath);

      const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
      this.logger.log(
        `✅ [FFmpeg Worker] Audio extracted successfully in ${elapsed}s! Output: ${outputPath} (Duration: ${durationSeconds}s)`,
      );

      // 3. Emit DuaAudioProcessed completion event to Kafka
      const processedEvent: DuaAudioProcessedEvent = {
        jobId,
        duaId,
        audioUrl,
        audioPath: outputPath,
        duration: durationSeconds,
        reciterName,
        language,
        status: 'COMPLETED',
        timestamp: new Date().toISOString(),
      };

      await this.kafkaProducer.emit(KAFKA_TOPIC_DUA_AUDIO_PROCESSED, duaId, processedEvent);
    } catch (error: any) {
      this.logger.error(
        `❌ [FFmpeg Worker] Audio extraction failed for Job '${jobId}': ${error.message}`,
        error.stack,
      );

      // Emit Failure event
      const failedEvent: DuaAudioProcessedEvent = {
        jobId,
        duaId,
        audioUrl: '',
        audioPath: '',
        duration: 0,
        reciterName,
        language,
        status: 'FAILED',
        error: error.message,
        timestamp: new Date().toISOString(),
      };

      await this.kafkaProducer.emit(KAFKA_TOPIC_DUA_AUDIO_PROCESSED, duaId, failedEvent);
    }
  }

  private extractAudioWithFFmpeg(inputPath: string, outputPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .noVideo()
        .audioCodec('libmp3lame')
        .audioBitrate(192)
        .audioFrequency(44100)
        .audioChannels(2)
        .output(outputPath)
        .on('start', (cmdLine) => {
          this.logger.debug(`FFmpeg command: ${cmdLine}`);
        })
        .on('end', () => {
          resolve();
        })
        .on('error', (err) => {
          reject(err);
        })
        .run();
    });
  }

  private probeAudioDuration(audioPath: string): Promise<number> {
    return new Promise((resolve) => {
      ffmpeg.ffprobe(audioPath, (err, metadata) => {
        if (err || !metadata || !metadata.format || !metadata.format.duration) {
          this.logger.warn(`Could not probe exact duration with ffprobe. Defaulting to 0.`);
          return resolve(0);
        }
        const duration = Math.round(metadata.format.duration);
        resolve(duration);
      });
    });
  }
}
