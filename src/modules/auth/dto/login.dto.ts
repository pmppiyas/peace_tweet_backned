import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty({
    example: 'admin@example.com',
    description: 'Email address or username',
  })
  @IsString()
  @IsNotEmpty({ message: 'Email or username is required' })
  identifier: string;

  @ApiProperty({ example: 'Admin123!', description: 'Account password' })
  @IsString()
  @IsNotEmpty({ message: 'Password is required' })
  password: string;
}
