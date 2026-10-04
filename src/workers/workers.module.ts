import { Module } from '@nestjs/common';
import { KafkaModule } from '../kafka/kafka.module';
import { AudioWorkerService } from './audio-worker.service';
import { PostWorkerService } from './post-worker.service';

@Module({
  imports: [KafkaModule],
  providers: [AudioWorkerService, PostWorkerService],
  exports: [AudioWorkerService, PostWorkerService],
})
export class WorkersModule {}
