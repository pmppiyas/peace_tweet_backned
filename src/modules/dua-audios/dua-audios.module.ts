import { Module } from '@nestjs/common';
import { DuaAudiosController } from './dua-audios.controller';
import { DuaAudiosService } from './dua-audios.service';

@Module({
  controllers: [DuaAudiosController],
  providers: [DuaAudiosService],
  exports: [DuaAudiosService],
})
export class DuaAudiosModule {}
