import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { PostType } from '../../../common/enums/post-type.enum';

export class CreateGroupPostDto {
  @ApiProperty({
    description: 'Text content of the group post',
    example: 'Assalamu Alaikum wa Rahmatullah, sharing a daily reflection for our group members.',
  })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({
    description: 'Type of post',
    enum: PostType,
    default: PostType.TEXT,
  })
  @IsOptional()
  @IsEnum(PostType)
  type?: PostType = PostType.TEXT;

  @ApiPropertyOptional({
    description: 'Referenced Dua UUID if type is DUA',
    example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  })
  @IsOptional()
  @IsUUID()
  duaId?: string;
}
