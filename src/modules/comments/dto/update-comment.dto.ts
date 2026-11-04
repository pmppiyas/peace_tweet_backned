import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class UpdateCommentDto {
  @ApiProperty({
    example: 'Updated comment text.',
    description: 'Updated comment text',
  })
  @IsString()
  @IsNotEmpty({ message: 'Comment content cannot be empty.' })
  @MaxLength(2000, { message: 'Comment cannot exceed 2000 characters.' })
  content: string;
}
