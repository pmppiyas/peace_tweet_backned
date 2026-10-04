import { KafkaProducerService } from '../../kafka/kafka-producer.service';
import { PostWorkerService } from '../../workers/post-worker.service';
import { AudioWorkerService } from '../../workers/audio-worker.service';

export const kafkaProducerService = new KafkaProducerService();

// Mock ConfigService for standalone Express runtime
const mockConfigService: any = {
  get: (key: string) => {
    if (key === 'kafka.brokers') {
      return process.env.KAFKA_BROKERS
        ? process.env.KAFKA_BROKERS.split(',').map((b) => b.trim()).filter(Boolean)
        : [];
    }
    if (key === 'kafka.groupId') {
      return process.env.KAFKA_GROUP_ID || 'peacetweet-post-worker-group';
    }
    if (key === 'kafka.clientId') {
      return process.env.KAFKA_CLIENT_ID || 'peacetweet-api';
    }
    return undefined;
  },
};

// Instantiate and initialize post worker listener for background processing & cache invalidation
export const postWorkerService = new PostWorkerService(mockConfigService, kafkaProducerService);
export const audioWorkerService = new AudioWorkerService(mockConfigService, kafkaProducerService);

postWorkerService.onModuleInit().catch((err: any) => {
  console.warn('PostWorkerService initialization note:', err.message);
});

audioWorkerService.onModuleInit().catch((err: any) => {
  console.warn('AudioWorkerService initialization note:', err.message);
});

