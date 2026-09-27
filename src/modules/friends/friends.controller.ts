import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { ActiveUserData } from '../../common/interfaces/active-user-data.interface';
import { FriendQueryDto, FriendRequestQueryDto } from './dto/friend-query.dto';
import {
  FriendActionResponseDto,
  FriendRequestItemDto,
  FriendshipStatusResponseDto,
  PaginatedFriendRequestsResponseDto,
  PaginatedFriendsResponseDto,
} from './dto/friend-response.dto';
import { SendFriendRequestDto } from './dto/send-friend-request.dto';
import { FriendsService } from './friends.service';

@ApiTags('Friends')
@ApiBearerAuth('JWT-auth')
@Controller('friends')
export class FriendsController {
  constructor(private readonly friendsService: FriendsService) {}

  // Send a friend request
  @Post('requests')
  @ApiOperation({ summary: 'Send a friend request to a user' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Friend request sent successfully',
    type: FriendRequestItemDto,
  })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Cannot send request to yourself' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Target user not found' })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Already friends or request already pending',
  })
  async sendRequest(@CurrentUser() user: ActiveUserData, @Body() dto: SendFriendRequestDto) {
    return this.friendsService.sendRequest(user.id, dto.receiverId);
  }

  // Cancel a sent friend request
  @Delete('requests/:requestId')
  @ApiOperation({ summary: 'Cancel a pending friend request sent by current user' })
  @ApiParam({ name: 'requestId', description: 'UUID of the friend request' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Friend request cancelled successfully',
    type: FriendActionResponseDto,
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Friend request not found' })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Not authorized to cancel this request',
  })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Request is not in pending state' })
  async cancelRequest(
    @CurrentUser() user: ActiveUserData,
    @Param('requestId', ParseUUIDPipe) requestId: string,
  ) {
    return this.friendsService.cancelRequest(requestId, user.id);
  }

  // Accept a received friend request
  @Post('requests/:requestId/accept')
  @ApiOperation({ summary: 'Accept a received pending friend request' })
  @ApiParam({ name: 'requestId', description: 'UUID of the friend request' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Friend request accepted and friendship established',
    type: FriendActionResponseDto,
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Friend request not found' })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Not authorized to accept this request',
  })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Request is not in pending state' })
  async acceptRequest(
    @CurrentUser() user: ActiveUserData,
    @Param('requestId', ParseUUIDPipe) requestId: string,
  ) {
    return this.friendsService.acceptRequest(requestId, user.id);
  }

  // Reject a received friend request
  @Post('requests/:requestId/reject')
  @ApiOperation({ summary: 'Reject/decline a received pending friend request' })
  @ApiParam({ name: 'requestId', description: 'UUID of the friend request' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Friend request rejected successfully',
    type: FriendActionResponseDto,
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Friend request not found' })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Not authorized to reject this request',
  })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Request is not in pending state' })
  async rejectRequest(
    @CurrentUser() user: ActiveUserData,
    @Param('requestId', ParseUUIDPipe) requestId: string,
  ) {
    return this.friendsService.rejectRequest(requestId, user.id);
  }

  // Get received pending friend requests
  @Get('requests/received')
  @ApiOperation({ summary: 'List received pending friend requests with cursor pagination' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of received friend requests',
    type: PaginatedFriendRequestsResponseDto,
  })
  async getReceivedRequests(
    @CurrentUser() user: ActiveUserData,
    @Query() query: FriendRequestQueryDto,
  ) {
    return this.friendsService.getReceivedRequests(user.id, query);
  }

  // Get sent pending friend requests
  @Get('requests/sent')
  @ApiOperation({ summary: 'List sent pending friend requests with cursor pagination' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of sent friend requests',
    type: PaginatedFriendRequestsResponseDto,
  })
  async getSentRequests(
    @CurrentUser() user: ActiveUserData,
    @Query() query: FriendRequestQueryDto,
  ) {
    return this.friendsService.getSentRequests(user.id, query);
  }

  // Get friends list with optional search and cursor pagination
  @Get()
  @ApiOperation({ summary: 'List all friends with search and cursor pagination' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of friends',
    type: PaginatedFriendsResponseDto,
  })
  async getFriends(@CurrentUser() user: ActiveUserData, @Query() query: FriendQueryDto) {
    return this.friendsService.getFriends(user.id, query);
  }

  // Remove a friend / unfriend
  @Delete(':userId')
  @ApiOperation({ summary: 'Remove a user from friends list' })
  @ApiParam({ name: 'userId', description: 'UUID of friend user to remove' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Friend removed successfully',
    type: FriendActionResponseDto,
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'User or friendship not found' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Cannot unfriend yourself' })
  async unfriend(
    @CurrentUser() user: ActiveUserData,
    @Param('userId', ParseUUIDPipe) userId: string,
  ) {
    return this.friendsService.unfriend(user.id, userId);
  }

  // Check relationship status with a user
  @Public()
  @Get('status/:userId')
  @ApiOperation({ summary: 'Check relationship status with a given user' })
  @ApiParam({ name: 'userId', description: 'UUID of user to check status with' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Relationship status returned',
    type: FriendshipStatusResponseDto,
  })
  async getStatus(
    @Param('userId', ParseUUIDPipe) userId: string,
    @CurrentUser() user?: ActiveUserData,
  ) {
    return this.friendsService.getRelationshipStatus(user?.id, userId);
  }
}
