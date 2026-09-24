import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Patch,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ActiveUserData } from '../../common/interfaces/active-user-data.interface';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserDto } from './dto/user-response.dto';
import { UsersService } from './users.service';

@ApiTags('Users')
@ApiBearerAuth('JWT-auth')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get profile of current logged-in user' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Current user profile returned successfully',
    type: UserDto,
  })
  async getProfile(@CurrentUser() user: ActiveUserData): Promise<UserDto> {
    return this.usersService.findById(user.id);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update profile details for current logged-in user' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User profile updated successfully',
    type: UserDto,
  })
  async updateProfile(
    @CurrentUser() user: ActiveUserData,
    @Body() dto: UpdateUserDto,
  ): Promise<UserDto> {
    return this.usersService.update(user.id, dto);
  }
}
