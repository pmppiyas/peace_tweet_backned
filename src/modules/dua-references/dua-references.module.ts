import { Module } from '@nestjs/common';
import { DuaReferencesController } from './dua-references.controller';
import { DuaReferencesService } from './dua-references.service';

@Module({
  controllers: [DuaReferencesController],
  providers: [DuaReferencesService],
  exports: [DuaReferencesService],
})
export class DuaReferencesModule {}
