import { PartialType } from '@nestjs/swagger';
import { CreateDuaReferenceDto } from './create-dua-reference.dto';

export class UpdateDuaReferenceDto extends PartialType(CreateDuaReferenceDto) {}
