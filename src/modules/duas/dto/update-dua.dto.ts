import { PartialType } from '@nestjs/swagger';
import { CreateDuaDto } from './create-dua.dto';

export class UpdateDuaDto extends PartialType(CreateDuaDto) {}
