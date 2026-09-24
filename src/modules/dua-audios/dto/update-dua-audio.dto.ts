import { PartialType } from '@nestjs/swagger';
import { CreateDuaAudioDto } from './create-dua-audio.dto';

export class UpdateDuaAudioDto extends PartialType(CreateDuaAudioDto) {}
