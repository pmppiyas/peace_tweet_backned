import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { ActiveUserData } from '../../common/interfaces/active-user-data.interface';
import { ChangeMemberRoleDto } from './dto/change-member-role.dto';
import { CreateGroupPostDto } from './dto/create-group-post.dto';
import { CreateGroupDto } from './dto/create-group.dto';
import { GroupQueryDto } from './dto/group-query.dto';
import {
  GroupActionResponseDto,
  GroupDetailResponseDto,
  GroupMembershipInfoDto,
  PaginatedGroupJoinRequestsResponseDto,
  PaginatedGroupMembersResponseDto,
  PaginatedGroupsResponseDto,
} from './dto/group-response.dto';
import { MemberQueryDto } from './dto/member-query.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { GroupsService } from './groups.service';

@ApiTags('Groups')
@ApiBearerAuth('JWT-auth')
@Controller('groups')
export class GroupsController {
  constructor(private readonly groupsService: GroupsService) {}

  // 1. Create a new group
  @Post()
  @ApiOperation({ summary: 'Create a new group (creator becomes OWNER)' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Group created successfully',
    type: GroupDetailResponseDto,
  })
  @ApiResponse({ status: HttpStatus.CONFLICT, description: 'Slug is already taken' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Validation error' })
  async createGroup(@CurrentUser() user: ActiveUserData, @Body() dto: CreateGroupDto) {
    return this.groupsService.createGroup(user.id, dto);
  }

  // 2. Discover / Search groups
  @Public()
  @Get()
  @ApiOperation({ summary: 'Discover and search groups with cursor pagination' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Paginated list of groups',
    type: PaginatedGroupsResponseDto,
  })
  async discoverGroups(@Query() query: GroupQueryDto, @CurrentUser() user?: ActiveUserData) {
    return this.groupsService.discoverGroups(query, user?.id);
  }

  // 3. Get my joined groups
  @Get('me')
  @ApiOperation({ summary: "Get current user's joined groups with pagination" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Paginated list of my groups',
    type: PaginatedGroupsResponseDto,
  })
  async getMyGroups(@CurrentUser() user: ActiveUserData, @Query() query: GroupQueryDto) {
    return this.groupsService.getMyGroups(user.id, query);
  }

  // 4. Get group by ID
  @Public()
  @Get('by-id/:groupId')
  @ApiOperation({ summary: 'Get group details by UUID' })
  @ApiParam({ name: 'groupId', description: 'UUID of the group' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Group details returned',
    type: GroupDetailResponseDto,
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Group not found' })
  async getGroupById(
    @Param('groupId', ParseUUIDPipe) groupId: string,
    @CurrentUser() user?: ActiveUserData,
  ) {
    return this.groupsService.getGroupById(groupId, user?.id);
  }

  // 5. Get group by slug
  @Public()
  @Get(':slug')
  @ApiOperation({ summary: 'Get group details by unique slug' })
  @ApiParam({ name: 'slug', description: 'Unique slug of the group' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Group details returned',
    type: GroupDetailResponseDto,
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Group not found' })
  async getGroupBySlug(@Param('slug') slug: string, @CurrentUser() user?: ActiveUserData) {
    return this.groupsService.getGroupBySlug(slug, user?.id);
  }

  // 6. Update group
  @Patch(':groupId')
  @ApiOperation({ summary: 'Update group details (OWNER / ADMIN only)' })
  @ApiParam({ name: 'groupId', description: 'UUID of the group' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Group updated successfully',
    type: GroupDetailResponseDto,
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Not authorized' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Group not found' })
  @ApiResponse({ status: HttpStatus.CONFLICT, description: 'New slug already taken' })
  async updateGroup(
    @Param('groupId', ParseUUIDPipe) groupId: string,
    @CurrentUser() user: ActiveUserData,
    @Body() dto: UpdateGroupDto,
  ) {
    return this.groupsService.updateGroup(groupId, user.id, dto);
  }

  // 7. Delete group
  @Delete(':groupId')
  @ApiOperation({ summary: 'Delete group (OWNER only)' })
  @ApiParam({ name: 'groupId', description: 'UUID of the group' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Group deleted successfully',
    type: GroupActionResponseDto,
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Only owner can delete group' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Group not found' })
  async deleteGroup(
    @Param('groupId', ParseUUIDPipe) groupId: string,
    @CurrentUser() user: ActiveUserData,
  ) {
    return this.groupsService.deleteGroup(groupId, user.id);
  }

  // 8. Join public group OR request to join private group
  @Post(':groupId/join')
  @ApiOperation({
    summary: 'Join a public group directly OR submit a join request for a private group',
  })
  @ApiParam({ name: 'groupId', description: 'UUID of the group' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Joined or join request submitted',
  })
  @ApiResponse({ status: HttpStatus.CONFLICT, description: 'Already member or request pending' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Group not found' })
  async joinGroup(
    @Param('groupId', ParseUUIDPipe) groupId: string,
    @CurrentUser() user: ActiveUserData,
  ) {
    return this.groupsService.joinGroup(groupId, user.id);
  }

  // 9. Cancel pending join request
  @Delete(':groupId/join-request')
  @ApiOperation({ summary: 'Cancel own pending join request for a private group' })
  @ApiParam({ name: 'groupId', description: 'UUID of the group' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Join request cancelled',
    type: GroupActionResponseDto,
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'No pending request found' })
  async cancelJoinRequest(
    @Param('groupId', ParseUUIDPipe) groupId: string,
    @CurrentUser() user: ActiveUserData,
  ) {
    return this.groupsService.cancelJoinRequest(groupId, user.id);
  }

  // 10. Leave group
  @Delete(':groupId/leave')
  @ApiOperation({ summary: 'Leave a group (OWNER cannot leave without transfer)' })
  @ApiParam({ name: 'groupId', description: 'UUID of the group' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Left group successfully',
    type: GroupActionResponseDto,
  })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Owner cannot leave directly' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Not a member' })
  async leaveGroup(
    @Param('groupId', ParseUUIDPipe) groupId: string,
    @CurrentUser() user: ActiveUserData,
  ) {
    return this.groupsService.leaveGroup(groupId, user.id);
  }

  // 11. Get group members
  @Public()
  @Get(':groupId/members')
  @ApiOperation({ summary: 'Get list of group members with cursor pagination and search' })
  @ApiParam({ name: 'groupId', description: 'UUID of the group' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Paginated list of members',
    type: PaginatedGroupMembersResponseDto,
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Private group members are hidden' })
  async getMembers(
    @Param('groupId', ParseUUIDPipe) groupId: string,
    @Query() query: MemberQueryDto,
    @CurrentUser() user?: ActiveUserData,
  ) {
    return this.groupsService.getMembers(groupId, query, user?.id);
  }

  // 12. Get pending join requests
  @Get(':groupId/requests')
  @ApiOperation({ summary: 'Get pending join requests (OWNER / ADMIN only)' })
  @ApiParam({ name: 'groupId', description: 'UUID of the group' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Paginated list of pending join requests',
    type: PaginatedGroupJoinRequestsResponseDto,
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Not authorized' })
  async getJoinRequests(
    @Param('groupId', ParseUUIDPipe) groupId: string,
    @Query() query: GroupQueryDto,
    @CurrentUser() user: ActiveUserData,
  ) {
    return this.groupsService.getJoinRequests(groupId, query, user.id);
  }

  // 13. Accept join request
  @Post(':groupId/requests/:requestId/accept')
  @ApiOperation({ summary: 'Accept a pending join request (OWNER / ADMIN only)' })
  @ApiParam({ name: 'groupId', description: 'UUID of the group' })
  @ApiParam({ name: 'requestId', description: 'UUID of the join request' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Request accepted and member added',
    type: GroupActionResponseDto,
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Not authorized' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Request not found' })
  async acceptJoinRequest(
    @Param('groupId', ParseUUIDPipe) groupId: string,
    @Param('requestId', ParseUUIDPipe) requestId: string,
    @CurrentUser() user: ActiveUserData,
  ) {
    return this.groupsService.acceptJoinRequest(groupId, requestId, user.id);
  }

  // 14. Reject join request
  @Post(':groupId/requests/:requestId/reject')
  @ApiOperation({ summary: 'Reject a pending join request (OWNER / ADMIN only)' })
  @ApiParam({ name: 'groupId', description: 'UUID of the group' })
  @ApiParam({ name: 'requestId', description: 'UUID of the join request' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Request rejected',
    type: GroupActionResponseDto,
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Not authorized' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Request not found' })
  async rejectJoinRequest(
    @Param('groupId', ParseUUIDPipe) groupId: string,
    @Param('requestId', ParseUUIDPipe) requestId: string,
    @CurrentUser() user: ActiveUserData,
  ) {
    return this.groupsService.rejectJoinRequest(groupId, requestId, user.id);
  }

  // 15. Remove member
  @Delete(':groupId/members/:userId')
  @ApiOperation({ summary: 'Remove a member from the group (OWNER / ADMIN only)' })
  @ApiParam({ name: 'groupId', description: 'UUID of the group' })
  @ApiParam({ name: 'userId', description: 'UUID of the member to remove' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Member removed successfully',
    type: GroupActionResponseDto,
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Not authorized' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Member not found' })
  async removeMember(
    @Param('groupId', ParseUUIDPipe) groupId: string,
    @Param('userId', ParseUUIDPipe) targetUserId: string,
    @CurrentUser() user: ActiveUserData,
  ) {
    return this.groupsService.removeMember(groupId, targetUserId, user.id);
  }

  // 16. Change member role
  @Patch(':groupId/members/:userId/role')
  @ApiOperation({ summary: 'Change a member role (MEMBER, MODERATOR, ADMIN)' })
  @ApiParam({ name: 'groupId', description: 'UUID of the group' })
  @ApiParam({ name: 'userId', description: 'UUID of the member' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Role changed successfully',
    type: GroupActionResponseDto,
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Not authorized' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid role assignment' })
  async changeMemberRole(
    @Param('groupId', ParseUUIDPipe) groupId: string,
    @Param('userId', ParseUUIDPipe) targetUserId: string,
    @CurrentUser() user: ActiveUserData,
    @Body() dto: ChangeMemberRoleDto,
  ) {
    return this.groupsService.changeMemberRole(groupId, targetUserId, dto.role, user.id);
  }

  // 17. Get membership status
  @Public()
  @Get(':groupId/membership')
  @ApiOperation({ summary: 'Get current user membership status with a group' })
  @ApiParam({ name: 'groupId', description: 'UUID of the group' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Membership status returned',
    type: GroupMembershipInfoDto,
  })
  async getMembershipStatus(
    @Param('groupId', ParseUUIDPipe) groupId: string,
    @CurrentUser() user?: ActiveUserData,
  ) {
    return this.groupsService.getMembershipStatus(groupId, user?.id);
  }

  // 18. Get group posts
  @Public()
  @Get(':groupId/posts')
  @ApiOperation({ summary: 'Get posts in this group with cursor pagination' })
  @ApiParam({ name: 'groupId', description: 'UUID of the group' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of group posts',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Private group posts require membership',
  })
  async getGroupPosts(
    @Param('groupId', ParseUUIDPipe) groupId: string,
    @Query() query: GroupQueryDto,
    @CurrentUser() user?: ActiveUserData,
  ) {
    return this.groupsService.getGroupPosts(groupId, query, user?.id);
  }

  // 19. Create post inside group
  @Post(':groupId/posts')
  @ApiOperation({ summary: 'Create a post inside the group (must be a member)' })
  @ApiParam({ name: 'groupId', description: 'UUID of the group' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Post created in group',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Must be a member to post' })
  async createGroupPost(
    @Param('groupId', ParseUUIDPipe) groupId: string,
    @CurrentUser() user: ActiveUserData,
    @Body() dto: CreateGroupPostDto,
  ) {
    return this.groupsService.createGroupPost(groupId, user.id, dto);
  }
}
