import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Kafka, Producer, logLevel } from 'kafkajs';

type LocalEventListener = (topic: string, key: string, message: any) => Promise<void> | void;

@Injectable()
export class KafkaProducerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KafkaProducerService.name);
  private kafka: Kafka | null = null;
  private producer: Producer | null = null;
  private isConnected = false;
  private readonly localListeners: Map<string, LocalEventListener[]> = new Map();

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    await this.connect();
  }

  async onModuleDestroy() {
    await this.disconnect();
  }

  private async connect(): Promise<void> {
    const brokers =
      this.configService.get<string[]>('kafka.brokers') ||
      (process.env.KAFKA_BROKERS ? process.env.KAFKA_BROKERS.split(',') : ['localhost:9092']);
    const clientId =
      this.configService.get<string>('kafka.clientId') ||
      process.env.KAFKA_CLIENT_ID ||
      'peacetweet-api';

    try {
      this.kafka = new Kafka({
        clientId,
        brokers,
        logLevel: logLevel.WARN,
        retry: {
          initialRetryTime: 300,
          retries: 3,
        },
      });

      this.producer = this.kafka.producer({
        allowAutoTopicCreation: true,
      });

      await this.producer.connect();
      this.isConnected = true;
      this.logger.log(`✅ Connected to Kafka Producer successfully at [${brokers.join(', ')}]`);
    } catch (error: any) {
      this.isConnected = false;
      this.logger.warn(
        `⚠️ Kafka connection notice: ${error.message}. (Local asynchronous event fallback is active)`,
      );
    }
  }

  isAvailable(): boolean {
    return this.isConnected && this.producer !== null;
  }

  // Produce a message to a Kafka topic
  async emit<T>(topic: string, key: string, payload: T): Promise<void> {
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
          this.logger.error(`Error in local event handler for topic '${topic}': ${err.message}`, err.stack);
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
