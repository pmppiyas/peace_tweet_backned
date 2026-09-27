import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsUUID } from 'class-validator';

// DTO for sending a friend request
export class SendFriendRequestDto {
  @ApiProperty({
    description: 'Target user UUID to whom the friend request is being sent',
    example: 'd8a6e8b2-5f33-4f0e-9494-b1c73a0889cf',
  })
  @IsNotEmpty()
  @IsUUID('4', { message: 'receiverId must be a valid UUID' })
  receiverId: string;
}
