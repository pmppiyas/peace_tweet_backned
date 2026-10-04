import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Consumer, Kafka, logLevel } from 'kafkajs';
import {
  KAFKA_TOPIC_POST_CREATED,
  PostCreatedEvent,
} from '../kafka/events/post-created.event';
import {
  KAFKA_TOPIC_POST_SHARED,
  PostSharedEvent,
} from '../kafka/events/post-shared.event';
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
    // Register local in-memory fallback listener for post created
    this.kafkaProducer.registerLocalListener(
      KAFKA_TOPIC_POST_CREATED,
      async (topic, key, payload: PostCreatedEvent) => {
        await this.handlePostCreated(payload);
      },
    );

    // Register local in-memory fallback listener for post shared
    this.kafkaProducer.registerLocalListener(
      KAFKA_TOPIC_POST_SHARED,
      async (topic, key, payload: PostSharedEvent) => {
        await this.handlePostShared(payload);
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
        ? process.env.KAFKA_BROKERS.split(',').map((b) => b.trim()).filter(Boolean)
        : []);
    const groupId =
      this.configService.get<string>('kafka.groupId') ||
      process.env.KAFKA_GROUP_ID ||
      '';

    if (!brokers.length || !groupId) {
      this.isConnected = false;
      this.logger.warn('⚠️ Kafka brokers or group ID not configured. Skipping Post Worker consumer initialization.');
      return;
    }

    try {
      this.kafka = new Kafka({
        clientId: 'peacetweet-post-worker',
        brokers,
        logLevel: logLevel.NOTHING,
        connectionTimeout: 1000,
        retry: {
          initialRetryTime: 100,
          retries: 0,
        },
      });

      this.consumer = this.kafka.consumer({
        groupId,
        retry: {
          initialRetryTime: 100,
          retries: 0,
        },
      });
      await this.consumer.connect();
      await this.consumer.subscribe({
        topics: [KAFKA_TOPIC_POST_CREATED, KAFKA_TOPIC_POST_SHARED],
        fromBeginning: false,
      });

      this.isConnected = true;
      this.logger.log(
        `📬 Post Worker Kafka Consumer connected & listening on topics '${KAFKA_TOPIC_POST_CREATED}', '${KAFKA_TOPIC_POST_SHARED}'`,
      );

      await this.consumer.run({
        eachMessage: async ({ topic, message }) => {
          if (!message.value) return;
          try {
            const data = JSON.parse(message.value.toString());
            if (topic === KAFKA_TOPIC_POST_SHARED) {
              await this.handlePostShared(data);
            } else {
              await this.handlePostCreated(data);
            }
          } catch (err: any) {
            this.logger.error(`Error processing Kafka message: ${err.message}`, err.stack);
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

  async handlePostShared(event: PostSharedEvent): Promise<void> {
    this.logger.log(
      `⚡ [PostWorker] Processed share event via Kafka (Content: ${event.contentType} ${event.contentId} -> Target: ${event.target})`,
    );
    try {
      await cacheService.delPattern('feed:*');
      await cacheService.delPattern('posts:*');
      await cacheService.delPattern('groups:*');
      await cacheService.delPattern('search:*');
      if (event.sharedPostId) {
        await cacheService.delPattern(`posts:id:${event.sharedPostId}*`);
      }
    } catch (err: any) {
      this.logger.warn(`PostWorker share cache invalidation notice: ${err.message}`);
    }
  }
}
