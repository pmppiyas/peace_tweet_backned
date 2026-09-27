import { Module } from '@nestjs/common';
import { KafkaModule } from '../kafka/kafka.module';
import { AudioWorkerService } from './audio-worker.service';

@Module({
  imports: [KafkaModule],
  providers: [AudioWorkerService],
  exports: [AudioWorkerService],
})
export class WorkersModule {}
