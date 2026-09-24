import { ApiProperty } from '@nestjs/swagger';
import { Role } from '../../../common/enums/role.enum';

export class UserDto {
  @ApiProperty({ example: 'b6f6f1c4-1234-4b56-789a-0123456789ab' })
  id: string;

  @ApiProperty({ example: 'Abdullah Al Mamun' })
  name: string;

  @ApiProperty({ example: 'abdullah99' })
  username: string;

  @ApiProperty({ example: 'abdullah@example.com' })
  email: string;

  @ApiProperty({ enum: Role, example: Role.USER })
  role: Role;

  @ApiProperty({ example: '2026-09-24T12:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2026-09-24T12:00:00.000Z' })
  updatedAt: Date;
}
