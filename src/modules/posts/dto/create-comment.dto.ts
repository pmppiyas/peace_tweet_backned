import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateCommentDto {
  @ApiProperty({
    example: 'JazakAllahu Khairan for sharing this reminder.',
    description: 'Comment text',
  })
  @IsString()
  @IsNotEmpty({ message: 'Comment content cannot be empty.' })
  @MaxLength(1000, { message: 'Comment cannot exceed 1000 characters.' })
  content: string;

  @ApiPropertyOptional({
    example: 'b1e23456-7890-1234-5678-90abcdef1234',
    description: 'Optional parent comment ID when replying to an existing comment',
  })
  @IsOptional()
  @IsUUID('4', { message: 'parentId must be a valid UUID.' })
  parentId?: string | null;
}
