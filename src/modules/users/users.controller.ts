import { Body, Controller, Get, HttpStatus, Param, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { ActiveUserData } from '../../common/interfaces/active-user-data.interface';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserDto, UserProfileDto } from './dto/user-response.dto';
import { UsersService } from './users.service';

@ApiTags('Users')
@ApiBearerAuth('JWT-auth')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // Get profile of current logged-in user
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

  // Update profile details for current logged-in user
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

  // Get public user profile by username
  @Public()
  @Get(':username')
  @ApiOperation({ summary: 'Get user profile by username with friendship status' })
  @ApiParam({ name: 'username', description: 'Username of the user' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User profile returned successfully',
    type: UserProfileDto,
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'User not found' })
  async getByUsername(
    @Param('username') username: string,
    @CurrentUser() viewer?: ActiveUserData,
  ): Promise<UserProfileDto> {
    return this.usersService.findByUsername(username, viewer?.id);
  }
}
