import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Consumer, Kafka, logLevel } from 'kafkajs';
import {
  KAFKA_TOPIC_POST_CREATED,
  PostCreatedEvent,
} from '../kafka/events/post-created.event';
import { KafkaProducerService } from '../kafka/kafka-producer.service';
import { cacheService } from '../app/config/cache';

@Injectable()
export class PostWorkerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PostWorkerService.name);
  private kafka: Kafka | null = null;
  private consumer: Consumer | null = null;
  private isConnected = false;

  constructor(
    private readonly configService: ConfigService,
    private readonly kafkaProducer: KafkaProducerService,
  ) {}

  async onModuleInit() {
    // Register local in-memory fallback listener
    this.kafkaProducer.registerLocalListener(
      KAFKA_TOPIC_POST_CREATED,
      async (topic, key, payload: PostCreatedEvent) => {
        await this.handlePostCreated(payload);
      },
    );

    // Initialize Kafka Consumer
    await this.initKafkaConsumer();
  }

  async onModuleDestroy() {
    if (this.consumer && this.isConnected) {
      try {
        await this.consumer.disconnect();
        this.logger.log('Kafka post worker consumer disconnected.');
      } catch (err: any) {
        this.logger.warn(`Error disconnecting Kafka post consumer: ${err.message}`);
      }
    }
  }

  private async initKafkaConsumer(): Promise<void> {
    const brokers =
      this.configService.get<string[]>('kafka.brokers') ||
      (process.env.KAFKA_BROKERS
        ? process.env.KAFKA_BROKERS.split(',').map((b) => b.trim())
        : ['localhost:9092']);
    const groupId =
      this.configService.get<string>('kafka.groupId') ||
      process.env.KAFKA_GROUP_ID ||
      'peacetweet-post-worker-group';

    try {
      this.kafka = new Kafka({
        clientId: 'peacetweet-post-worker',
        brokers,
        logLevel: logLevel.WARN,
      });

      this.consumer = this.kafka.consumer({ groupId });
      await this.consumer.connect();
      await this.consumer.subscribe({
        topic: KAFKA_TOPIC_POST_CREATED,
        fromBeginning: false,
      });

      this.isConnected = true;
      this.logger.log(
        `📬 Post Worker Kafka Consumer connected & listening on topic '${KAFKA_TOPIC_POST_CREATED}'`,
      );

      await this.consumer.run({
        eachMessage: async ({ message }) => {
          if (!message.value) return;
          try {
            const event: PostCreatedEvent = JSON.parse(message.value.toString());
            await this.handlePostCreated(event);
          } catch (err: any) {
            this.logger.error(`Error processing Kafka post message: ${err.message}`, err.stack);
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

  async handlePostCreated(event: PostCreatedEvent): Promise<void> {
    this.logger.log(
      `⚡ [PostWorker] Processed post creation event via Kafka for Post ID: ${event.postId} (Type: ${event.type})`,
    );
    try {
      // Invalidate relevant feed & search caches
      await cacheService.delPattern('feed:*');
      await cacheService.delPattern(`posts:id:${event.postId}*`);
      await cacheService.delPattern('search:*');
    } catch (err: any) {
      this.logger.warn(`PostWorker cache invalidation notice: ${err.message}`);
    }
  }
}
