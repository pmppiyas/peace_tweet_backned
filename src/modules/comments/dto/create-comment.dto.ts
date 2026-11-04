import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateCommentDto {
  @ApiPropertyOptional({
    example: 'a1b2c3d4-e5f6-7890-1234-567890abcdef',
    description: 'Post ID for the comment (optional in body if provided in URL param)',
  })
  @IsOptional()
  @IsUUID('4', { message: 'postId must be a valid UUID.' })
  postId?: string;

  @ApiProperty({
    example: 'JazakAllahu Khairan for sharing this reminder.',
    description: 'Comment text',
  })
  @IsString()
  @IsNotEmpty({ message: 'Comment content cannot be empty.' })
  @MaxLength(2000, { message: 'Comment cannot exceed 2000 characters.' })
  content: string;

  @ApiPropertyOptional({
    example: 'b1e23456-7890-1234-5678-90abcdef1234',
    description: 'Optional parent comment ID when replying to an existing comment',
  })
  @IsOptional()
  @IsUUID('4', { message: 'parentId must be a valid UUID.' })
  parentId?: string | null;
}
