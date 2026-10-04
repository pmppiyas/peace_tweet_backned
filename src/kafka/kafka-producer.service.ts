import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Kafka, Producer, Partitioners, logLevel } from 'kafkajs';

type LocalEventListener = (topic: string, key: string, message: any) => Promise<void> | void;

@Injectable()
export class KafkaProducerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KafkaProducerService.name);
  private kafka: Kafka | null = null;
  private producer: Producer | null = null;
  private isConnected = false;
  private isConnecting = false;
  private lastConnectAttempt = 0;
  private readonly connectCooldownMs = 60000; // 1 min cooldown if unreachable
  private readonly localListeners: Map<string, LocalEventListener[]> = new Map();

  constructor(private readonly configService?: ConfigService) {}

  async onModuleInit() {
    await this.connect();
  }

  async onModuleDestroy() {
    await this.disconnect();
  }

  private async connect(): Promise<void> {
    if (this.isConnecting) return;
    this.isConnecting = true;
    this.lastConnectAttempt = Date.now();

    const brokers =
      this.configService?.get<string[]>('kafka.brokers') ||
      (process.env.KAFKA_BROKERS
        ? process.env.KAFKA_BROKERS.split(',').map((b) => b.trim()).filter(Boolean)
        : []);
    const clientId =
      this.configService?.get<string>('kafka.clientId') ||
      process.env.KAFKA_CLIENT_ID ||
      'peacetweet-api';

    if (!brokers.length || !clientId) {
      this.isConnected = false;
      this.isConnecting = false;
      this.logger.warn(
        '⚠️ Kafka brokers or client ID not configured. (Local asynchronous event fallback is active)',
      );
      return;
    }

    try {
      this.kafka = new Kafka({
        clientId,
        brokers,
        logLevel: logLevel.NOTHING,
        connectionTimeout: 1000,
        retry: {
          initialRetryTime: 100,
          retries: 0,
        },
      });

      this.producer = this.kafka.producer({
        createPartitioner: Partitioners.LegacyPartitioner,
        allowAutoTopicCreation: true,
      });

      await this.producer.connect();
      this.isConnected = true;
      this.logger.log(`✅ Connected to Kafka Producer successfully at [${brokers.join(', ')}]`);
    } catch (error: any) {
      this.isConnected = false;
      this.logger.warn(
        `⚠️ Kafka broker unreachable at [${brokers.join(', ')}]. (Local asynchronous event pipeline is active)`,
      );
    } finally {
      this.isConnecting = false;
    }
  }

  isAvailable(): boolean {
    return this.isConnected && this.producer !== null;
  }

  // Produce a message to a Kafka topic
  async emit<T>(topic: string, key: string, payload: T): Promise<void> {
    if (!this.isAvailable()) {
      const now = Date.now();
      if (!this.isConnecting && now - this.lastConnectAttempt > this.connectCooldownMs) {
        // Trigger background connection attempt without blocking this request
        this.connect().catch(() => {});
      }
    }

    const serialized = JSON.stringify(payload);

    if (this.isAvailable() && this.producer) {
      try {
        await this.producer.send({
          topic,
          messages: [
            {
              key,
              value: serialized,
              timestamp: Date.now().toString(),
            },
          ],
        });
        this.logger.log(`📤 Emitted Kafka event on topic '${topic}' [Key: ${key}]`);
        return;
      } catch (error: any) {
        this.logger.warn(
          `Failed to emit to Kafka topic '${topic}': ${error.message}. Falling back to local dispatcher.`,
        );
      }
    }

    // Local in-memory asynchronous event fallback
    this.dispatchLocal(topic, key, payload);
  }

  // Register local in-memory fallback listener
  registerLocalListener(topic: string, listener: LocalEventListener): void {
    const existing = this.localListeners.get(topic) || [];
    existing.push(listener);
    this.localListeners.set(topic, existing);
  }

  private dispatchLocal(topic: string, key: string, payload: any): void {
    const listeners = this.localListeners.get(topic) || [];
    if (listeners.length === 0) {
      this.logger.debug(`No local listeners registered for topic '${topic}'`);
      return;
    }

    // Asynchronously dispatch
    setImmediate(async () => {
      for (const listener of listeners) {
        try {
          await listener(topic, key, payload);
        } catch (err: any) {
          this.logger.error(
            `Error in local event handler for topic '${topic}': ${err.message}`,
            err.stack,
          );
        }
      }
    });
  }

  private async disconnect(): Promise<void> {
    if (this.producer && this.isConnected) {
      try {
        await this.producer.disconnect();
        this.logger.log('Kafka producer disconnected cleanly.');
      } catch (err: any) {
        this.logger.warn(`Error disconnecting Kafka producer: ${err.message}`);
      }
    }
  }
}
