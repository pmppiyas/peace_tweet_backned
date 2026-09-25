import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateCommentDto {
  @ApiProperty({
    example: 'JazakAllahu Khairan for sharing this reminder.',
    description: 'Comment text',
  })
  @IsString()
  @IsNotEmpty({ message: 'Comment content cannot be empty.' })
  @MaxLength(1000, { message: 'Comment cannot exceed 1000 characters.' })
  content: string;
}
