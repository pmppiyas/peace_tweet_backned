import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DEFAULT_GROUPS_LIMIT, MAX_GROUPS_LIMIT, MIN_GROUPS_LIMIT } from '../../common/constants';
import { GroupJoinRequestStatus } from '../../common/enums/group-join-request-status.enum';
import { GroupMemberRole } from '../../common/enums/group-member-role.enum';
import { GroupMembershipStatus } from '../../common/enums/group-membership-status.enum';
import { GroupVisibility } from '../../common/enums/group-visibility.enum';
import { PostStatus } from '../../common/enums/post-status.enum';
import { PostType } from '../../common/enums/post-type.enum';
import { PostVisibility } from '../../common/enums/post-visibility.enum';
import {
  GroupDetail,
  GroupJoinRequestItem,
  GroupMemberItem,
  GroupMembershipInfo,
  PaginatedGroupJoinRequestsResponse,
  PaginatedGroupMembersResponse,
  PaginatedGroupsResponse,
} from '../../common/interfaces/group.interface';
import { PrismaService } from '../../database/prisma.service';
import { CreateGroupPostDto } from './dto/create-group-post.dto';
import { CreateGroupDto } from './dto/create-group.dto';
import { GroupQueryDto } from './dto/group-query.dto';
import { MemberQueryDto } from './dto/member-query.dto';
import { UpdateGroupDto } from './dto/update-group.dto';

@Injectable()
export class GroupsService {
  constructor(private readonly prisma: PrismaService) {}

  private get db(): any {
    return this.prisma;
  }

  // ==========================================
  // 1. CREATE GROUP
  // ==========================================
  async createGroup(userId: string, dto: CreateGroupDto): Promise<GroupDetail> {
    const slug = dto.slug.toLowerCase().trim();

    // Check slug uniqueness
    const existingGroup = await this.db.group.findUnique({
      where: { slug },
    });
    if (existingGroup) {
      throw new ConflictException(`Group slug '${slug}' is already taken.`);
    }

    // Atomic transaction: create group + assign creator as OWNER
    const group = await this.db.$transaction(async (tx: any) => {
      const createdGroup = await tx.group.create({
        data: {
          name: dto.name.trim(),
          slug,
          description: dto.description?.trim() || null,
          visibility: dto.visibility || GroupVisibility.PUBLIC,
          avatarUrl: dto.avatarUrl || null,
        },
      });

      await tx.groupMember.create({
        data: {
          groupId: createdGroup.id,
          userId,
          role: GroupMemberRole.OWNER,
        },
      });

      return createdGroup;
    });

    return {
      id: group.id,
      name: group.name,
      slug: group.slug,
      description: group.description,
      avatarUrl: group.avatarUrl,
      visibility: group.visibility,
      memberCount: 1,
      membership: {
        status: GroupMembershipStatus.OWNER,
        role: GroupMemberRole.OWNER,
        requestId: null,
      },
      createdAt: group.createdAt,
      updatedAt: group.updatedAt,
    };
  }

  // ==========================================
  // 2. UPDATE GROUP
  // ==========================================
  async updateGroup(groupId: string, userId: string, dto: UpdateGroupDto): Promise<GroupDetail> {
    const group = await this.db.group.findUnique({
      where: { id: groupId },
      include: {
        _count: {
          select: { members: true },
        },
      },
    });

    if (!group) {
      throw new NotFoundException(`Group with ID '${groupId}' not found.`);
    }

    // Must be OWNER or ADMIN
    await this.assertGroupAdmin(groupId, userId);

    let slug = group.slug;
    if (dto.slug && dto.slug.toLowerCase().trim() !== group.slug) {
      slug = dto.slug.toLowerCase().trim();
      const slugExists = await this.db.group.findUnique({
        where: { slug },
      });
      if (slugExists) {
        throw new ConflictException(`Group slug '${slug}' is already taken.`);
      }
    }

    const updated = await this.db.group.update({
      where: { id: groupId },
      data: {
        name: dto.name !== undefined ? dto.name.trim() : undefined,
        slug: dto.slug !== undefined ? slug : undefined,
        description: dto.description !== undefined ? dto.description?.trim() || null : undefined,
        visibility: dto.visibility !== undefined ? dto.visibility : undefined,
        avatarUrl: dto.avatarUrl !== undefined ? dto.avatarUrl : undefined,
      },
      include: {
        _count: {
          select: { members: true },
        },
      },
    });

    const membership = await this.getMembership(groupId, userId);

    return this.formatGroupDetail(updated, membership);
  }

  // ==========================================
  // 3. DELETE GROUP
  // ==========================================
  async deleteGroup(groupId: string, userId: string) {
    const group = await this.db.group.findUnique({
      where: { id: groupId },
    });

    if (!group) {
      throw new NotFoundException(`Group with ID '${groupId}' not found.`);
    }

    // Only OWNER can delete group
    await this.assertGroupOwner(groupId, userId);

    await this.db.group.delete({
      where: { id: groupId },
    });

    return {
      success: true,
      message: 'Group deleted successfully.',
    };
  }

  // ==========================================
  // 4. GET GROUP BY SLUG / ID
  // ==========================================
  async getGroupBySlug(slug: string, currentUserId?: string): Promise<GroupDetail> {
    const group = await this.db.group.findUnique({
      where: { slug: slug.toLowerCase().trim() },
      include: {
        _count: {
          select: { members: true },
        },
      },
    });

    if (!group) {
      throw new NotFoundException(`Group with slug '${slug}' not found.`);
    }

    const membership = currentUserId
      ? await this.getMembership(group.id, currentUserId)
      : { status: GroupMembershipStatus.NONE, role: null, requestId: null };

    return this.formatGroupDetail(group, membership);
  }

  async getGroupById(groupId: string, currentUserId?: string): Promise<GroupDetail> {
    const group = await this.db.group.findUnique({
      where: { id: groupId },
      include: {
        _count: {
          select: { members: true },
        },
      },
    });

    if (!group) {
      throw new NotFoundException(`Group with ID '${groupId}' not found.`);
    }

    const membership = currentUserId
      ? await this.getMembership(groupId, currentUserId)
      : { status: GroupMembershipStatus.NONE, role: null, requestId: null };

    return this.formatGroupDetail(group, membership);
  }

  // ==========================================
  // 5. DISCOVER / SEARCH GROUPS
  // ==========================================
  async discoverGroups(
    query: GroupQueryDto,
    currentUserId?: string,
  ): Promise<PaginatedGroupsResponse> {
    const limit = Math.min(
      Math.max(query.limit || DEFAULT_GROUPS_LIMIT, MIN_GROUPS_LIMIT),
      MAX_GROUPS_LIMIT,
    );
    const cursor = query.cursor;
    const search = query.search?.trim();

    const where: any = {};

    if (query.visibility) {
      where.visibility = query.visibility;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { slug: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const rawGroups = await this.db.group.findMany({
      where,
      take: limit + 1,
      cursor: cursor ? { id: cursor } : undefined,
      skip: cursor ? 1 : 0,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { members: true },
        },
      },
    });

    let nextCursor: string | null = null;
    let items = rawGroups;

    if (rawGroups.length > limit) {
      items = rawGroups.slice(0, limit);
      nextCursor = items[items.length - 1].id;
    }

    // Batch load memberships if authenticated
    let membershipMap: Record<string, GroupMembershipInfo> = {};
    if (currentUserId && items.length > 0) {
      const groupIds = items.map((g: any) => g.id);
      membershipMap = await this.batchGetMemberships(groupIds, currentUserId);
    }

    const formattedItems = items.map((group: any) => {
      const membership = membershipMap[group.id] || {
        status: GroupMembershipStatus.NONE,
        role: null,
        requestId: null,
      };
      return this.formatGroupDetail(group, membership);
    });

    return {
      items: formattedItems,
      nextCursor,
    };
  }

  // ==========================================
  // 6. MY GROUPS
  // ==========================================
  async getMyGroups(userId: string, query: GroupQueryDto): Promise<PaginatedGroupsResponse> {
    const limit = Math.min(
      Math.max(query.limit || DEFAULT_GROUPS_LIMIT, MIN_GROUPS_LIMIT),
      MAX_GROUPS_LIMIT,
    );
    const cursor = query.cursor;
    const search = query.search?.trim();

    const where: any = {
      userId,
    };

    if (search) {
      where.group = {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { slug: { contains: search, mode: 'insensitive' } },
        ],
      };
    }

    const rawMemberships = await this.db.groupMember.findMany({
      where,
      take: limit + 1,
      cursor: cursor ? { id: cursor } : undefined,
      skip: cursor ? 1 : 0,
      orderBy: { createdAt: 'desc' },
      include: {
        group: {
          include: {
            _count: {
              select: { members: true },
            },
          },
        },
      },
    });

    let nextCursor: string | null = null;
    let items = rawMemberships;

    if (rawMemberships.length > limit) {
      items = rawMemberships.slice(0, limit);
      nextCursor = items[items.length - 1].id;
    }

    const formattedItems = items.map((m: any) => {
      const membership: GroupMembershipInfo = {
        status: (m.role as unknown as GroupMembershipStatus) || GroupMembershipStatus.MEMBER,
        role: m.role,
        requestId: null,
      };
      return this.formatGroupDetail(m.group, membership);
    });

    return {
      items: formattedItems,
      nextCursor,
    };
  }

  // ==========================================
  // 7. JOIN GROUP / REQUEST TO JOIN
  // ==========================================
  async joinGroup(groupId: string, userId: string) {
    const group = await this.db.group.findUnique({
      where: { id: groupId },
    });

    if (!group) {
      throw new NotFoundException(`Group with ID '${groupId}' not found.`);
    }

    // Check if already a member
    const existingMember = await this.db.groupMember.findUnique({
      where: {
        groupId_userId: { groupId, userId },
      },
    });

    if (existingMember) {
      throw new ConflictException('You are already a member of this group.');
    }

    // Public group: join immediately
    if (group.visibility === GroupVisibility.PUBLIC) {
      await this.db.groupMember.create({
        data: {
          groupId,
          userId,
          role: GroupMemberRole.MEMBER,
        },
      });

      return {
        success: true,
        status: GroupMembershipStatus.MEMBER,
        message: 'Successfully joined group.',
      };
    }

    // Private group: request to join
    const existingRequest = await this.db.groupJoinRequest.findUnique({
      where: {
        groupId_userId: { groupId, userId },
      },
    });

    if (existingRequest && existingRequest.status === GroupJoinRequestStatus.PENDING) {
      throw new ConflictException('A join request for this group is already pending.');
    }

    const request = await this.db.groupJoinRequest.upsert({
      where: {
        groupId_userId: { groupId, userId },
      },
      create: {
        groupId,
        userId,
        status: GroupJoinRequestStatus.PENDING,
      },
      update: {
        status: GroupJoinRequestStatus.PENDING,
      },
    });

    return {
      success: true,
      status: GroupMembershipStatus.PENDING,
      requestId: request.id,
      message: 'Join request sent and awaiting approval.',
    };
  }

  // ==========================================
  // 8. CANCEL JOIN REQUEST
  // ==========================================
  async cancelJoinRequest(groupId: string, userId: string) {
    const request = await this.db.groupJoinRequest.findUnique({
      where: {
        groupId_userId: { groupId, userId },
      },
    });

    if (!request || request.status !== GroupJoinRequestStatus.PENDING) {
      throw new NotFoundException('No pending join request found to cancel.');
    }

    await this.db.groupJoinRequest.update({
      where: { id: request.id },
      data: {
        status: GroupJoinRequestStatus.CANCELLED,
      },
    });

    return {
      success: true,
      message: 'Join request cancelled successfully.',
    };
  }

  // ==========================================
  // 9. LEAVE GROUP
  // ==========================================
  async leaveGroup(groupId: string, userId: string) {
    const member = await this.db.groupMember.findUnique({
      where: {
        groupId_userId: { groupId, userId },
      },
    });

    if (!member) {
      throw new NotFoundException('You are not a member of this group.');
    }

    if (member.role === GroupMemberRole.OWNER) {
      throw new BadRequestException('Group owner must transfer ownership before leaving.');
    }

    await this.db.groupMember.delete({
      where: { id: member.id },
    });

    return {
      success: true,
      message: 'Left group successfully.',
    };
  }

  // ==========================================
  // 10. GET GROUP MEMBERS
  // ==========================================
  async getMembers(
    groupId: string,
    query: MemberQueryDto,
    currentUserId?: string,
  ): Promise<PaginatedGroupMembersResponse> {
    const group = await this.db.group.findUnique({
      where: { id: groupId },
    });

    if (!group) {
      throw new NotFoundException(`Group with ID '${groupId}' not found.`);
    }

    // If private, only members can view member list
    if (group.visibility === GroupVisibility.PRIVATE) {
      if (!currentUserId) {
        throw new ForbiddenException('You must be logged in and a member to view this group.');
      }
      await this.assertGroupMember(groupId, currentUserId);
    }

    const limit = Math.min(
      Math.max(query.limit || DEFAULT_GROUPS_LIMIT, MIN_GROUPS_LIMIT),
      MAX_GROUPS_LIMIT,
    );
    const cursor = query.cursor;
    const search = query.search?.trim();

    const where: any = {
      groupId,
    };

    if (query.role) {
      where.role = query.role;
    }

    if (search) {
      where.user = {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { username: { contains: search, mode: 'insensitive' } },
        ],
      };
    }

    const rawMembers = await this.db.groupMember.findMany({
      where,
      take: limit + 1,
      cursor: cursor ? { id: cursor } : undefined,
      skip: cursor ? 1 : 0,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            username: true,
          },
        },
      },
    });

    let nextCursor: string | null = null;
    let items = rawMembers;

    if (rawMembers.length > limit) {
      items = rawMembers.slice(0, limit);
      nextCursor = items[items.length - 1].id;
    }

    const formattedItems: GroupMemberItem[] = items.map((m: any) => ({
      id: m.id,
      groupId: m.groupId,
      role: m.role,
      joinedAt: m.createdAt,
      user: {
        id: m.user.id,
        name: m.user.name,
        username: m.user.username,
        avatarUrl: null,
      },
    }));

    return {
      items: formattedItems,
      nextCursor,
    };
  }

  // ==========================================
  // 11. GET PENDING JOIN REQUESTS
  // ==========================================
  async getJoinRequests(
    groupId: string,
    query: GroupQueryDto,
    userId: string,
  ): Promise<PaginatedGroupJoinRequestsResponse> {
    const group = await this.db.group.findUnique({
      where: { id: groupId },
    });

    if (!group) {
      throw new NotFoundException(`Group with ID '${groupId}' not found.`);
    }

    // Must be OWNER or ADMIN
    await this.assertGroupAdmin(groupId, userId);

    const limit = Math.min(
      Math.max(query.limit || DEFAULT_GROUPS_LIMIT, MIN_GROUPS_LIMIT),
      MAX_GROUPS_LIMIT,
    );
    const cursor = query.cursor;

    const rawRequests = await this.db.groupJoinRequest.findMany({
      where: {
        groupId,
        status: GroupJoinRequestStatus.PENDING,
      },
      take: limit + 1,
      cursor: cursor ? { id: cursor } : undefined,
      skip: cursor ? 1 : 0,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            username: true,
          },
        },
      },
    });

    let nextCursor: string | null = null;
    let items = rawRequests;

    if (rawRequests.length > limit) {
      items = rawRequests.slice(0, limit);
      nextCursor = items[items.length - 1].id;
    }

    const formattedItems: GroupJoinRequestItem[] = items.map((r: any) => ({
      id: r.id,
      groupId: r.groupId,
      status: r.status,
      createdAt: r.createdAt,
      user: {
        id: r.user.id,
        name: r.user.name,
        username: r.user.username,
        avatarUrl: null,
      },
    }));

    return {
      items: formattedItems,
      nextCursor,
    };
  }

  // ==========================================
  // 12. ACCEPT JOIN REQUEST
  // ==========================================
  async acceptJoinRequest(groupId: string, requestId: string, userId: string) {
    // Must be OWNER or ADMIN
    await this.assertGroupAdmin(groupId, userId);

    const request = await this.db.groupJoinRequest.findUnique({
      where: { id: requestId },
    });

    if (!request || request.groupId !== groupId) {
      throw new NotFoundException('Join request not found for this group.');
    }

    if (request.status !== GroupJoinRequestStatus.PENDING) {
      throw new BadRequestException('Request is no longer pending.');
    }

    // Atomic transaction: add member & mark request ACCEPTED
    await this.db.$transaction(async (tx: any) => {
      await tx.groupMember.upsert({
        where: {
          groupId_userId: {
            groupId,
            userId: request.userId,
          },
        },
        create: {
          groupId,
          userId: request.userId,
          role: GroupMemberRole.MEMBER,
        },
        update: {},
      });

      await tx.groupJoinRequest.update({
        where: { id: requestId },
        data: {
          status: GroupJoinRequestStatus.ACCEPTED,
        },
      });
    });

    return {
      success: true,
      message: 'Join request accepted and user added to group.',
    };
  }

  // ==========================================
  // 13. REJECT JOIN REQUEST
  // ==========================================
  async rejectJoinRequest(groupId: string, requestId: string, userId: string) {
    // Must be OWNER or ADMIN
    await this.assertGroupAdmin(groupId, userId);

    const request = await this.db.groupJoinRequest.findUnique({
      where: { id: requestId },
    });

    if (!request || request.groupId !== groupId) {
      throw new NotFoundException('Join request not found for this group.');
    }

    if (request.status !== GroupJoinRequestStatus.PENDING) {
      throw new BadRequestException('Request is no longer pending.');
    }

    await this.db.groupJoinRequest.update({
      where: { id: requestId },
      data: {
        status: GroupJoinRequestStatus.REJECTED,
      },
    });

    return {
      success: true,
      message: 'Join request rejected.',
    };
  }

  // ==========================================
  // 14. REMOVE MEMBER
  // ==========================================
  async removeMember(groupId: string, targetUserId: string, currentUserId: string) {
    if (targetUserId === currentUserId) {
      throw new BadRequestException('Use the leave group endpoint to leave.');
    }

    const currentMember = await this.db.groupMember.findUnique({
      where: {
        groupId_userId: { groupId, userId: currentUserId },
      },
    });

    if (!currentMember) {
      throw new ForbiddenException('You are not a member of this group.');
    }

    const targetMember = await this.db.groupMember.findUnique({
      where: {
        groupId_userId: { groupId, userId: targetUserId },
      },
    });

    if (!targetMember) {
      throw new NotFoundException('Member not found in this group.');
    }

    // Cannot remove group owner
    if (targetMember.role === GroupMemberRole.OWNER) {
      throw new ForbiddenException('Cannot remove the group owner.');
    }

    // Role checks:
    // OWNER can remove any member/admin
    // ADMIN can only remove MEMBER and MODERATOR (cannot remove other ADMINs or OWNER)
    if (currentMember.role === GroupMemberRole.ADMIN) {
      if (
        targetMember.role === GroupMemberRole.ADMIN ||
        targetMember.role === GroupMemberRole.OWNER
      ) {
        throw new ForbiddenException('Admins cannot remove other admins or owners.');
      }
    } else if (currentMember.role !== GroupMemberRole.OWNER) {
      throw new ForbiddenException('You do not have permission to remove members.');
    }

    await this.db.groupMember.delete({
      where: { id: targetMember.id },
    });

    return {
      success: true,
      message: 'Member removed from group successfully.',
    };
  }

  // ==========================================
  // 15. CHANGE MEMBER ROLE
  // ==========================================
  async changeMemberRole(
    groupId: string,
    targetUserId: string,
    newRole: GroupMemberRole,
    currentUserId: string,
  ) {
    if (newRole === GroupMemberRole.OWNER) {
      throw new BadRequestException('Cannot assign OWNER role via this endpoint.');
    }

    const currentMember = await this.db.groupMember.findUnique({
      where: {
        groupId_userId: { groupId, userId: currentUserId },
      },
    });

    if (!currentMember) {
      throw new ForbiddenException('You are not a member of this group.');
    }

    const targetMember = await this.db.groupMember.findUnique({
      where: {
        groupId_userId: { groupId, userId: targetUserId },
      },
    });

    if (!targetMember) {
      throw new NotFoundException('Member not found in this group.');
    }

    if (targetMember.role === GroupMemberRole.OWNER) {
      throw new ForbiddenException('Cannot change the role of the group owner.');
    }

    // OWNER can change any member role
    // ADMIN can only manage MEMBER / MODERATOR and cannot promote to ADMIN
    if (currentMember.role === GroupMemberRole.ADMIN) {
      if (targetMember.role === GroupMemberRole.ADMIN) {
        throw new ForbiddenException('Admins cannot change the role of other admins.');
      }
      if (newRole === GroupMemberRole.ADMIN) {
        throw new ForbiddenException('Only the group owner can promote members to Admin.');
      }
    } else if (currentMember.role !== GroupMemberRole.OWNER) {
      throw new ForbiddenException('You do not have permission to change member roles.');
    }

    await this.db.groupMember.update({
      where: { id: targetMember.id },
      data: { role: newRole },
    });

    return {
      success: true,
      message: `Member role updated to ${newRole}.`,
    };
  }

  // ==========================================
  // 16. GET MEMBERSHIP STATUS
  // ==========================================
  async getMembershipStatus(groupId: string, currentUserId?: string): Promise<GroupMembershipInfo> {
    if (!currentUserId) {
      return {
        status: GroupMembershipStatus.NONE,
        role: null,
        requestId: null,
      };
    }

    return this.getMembership(groupId, currentUserId);
  }

  // ==========================================
  // 17. GET GROUP POSTS
  // ==========================================
  async getGroupPosts(groupId: string, query: GroupQueryDto, currentUserId?: string) {
    const group = await this.db.group.findUnique({
      where: { id: groupId },
    });

    if (!group) {
      throw new NotFoundException(`Group with ID '${groupId}' not found.`);
    }

    // If private group, verify membership
    if (group.visibility === GroupVisibility.PRIVATE) {
      if (!currentUserId) {
        throw new ForbiddenException(
          'You must be logged in and a member to view posts in this group.',
        );
      }
      await this.assertGroupMember(groupId, currentUserId);
    }

    const limit = Math.min(
      Math.max(query.limit || DEFAULT_GROUPS_LIMIT, MIN_GROUPS_LIMIT),
      MAX_GROUPS_LIMIT,
    );
    const cursor = query.cursor;

    const rawPosts = await this.db.post.findMany({
      where: {
        groupId,
        status: PostStatus.PUBLISHED,
      },
      take: limit + 1,
      cursor: cursor ? { id: cursor } : undefined,
      skip: cursor ? 1 : 0,
      orderBy: { createdAt: 'desc' },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            username: true,
            avatarUrl: true,
          },
        },
        dua: {
          include: {
            category: true,
            references: {
              include: {
                source: true,
              },
            },
            audios: true,
          },
        },
        bloodRequest: {
          include: {
            requester: {
              select: {
                id: true,
                name: true,
                username: true,
                avatarUrl: true,
              },
            },
            donations: true,
          },
        },
        originalPost: {
          include: {
            author: {
              select: {
                id: true,
                name: true,
                username: true,
                avatarUrl: true,
              },
            },
            dua: {
              include: {
                category: true,
                references: {
                  include: {
                    source: true,
                  },
                },
                audios: true,
              },
            },
            bloodRequest: {
              include: {
                requester: {
                  select: {
                    id: true,
                    name: true,
                    username: true,
                    avatarUrl: true,
                  },
                },
                donations: true,
              },
            },
          },
        },
        _count: {
          select: {
            reactions: true,
            comments: true,
            savedPosts: true,
            shares: true,
            reposts: true,
          },
        },
        reactions: currentUserId
          ? {
              where: { userId: currentUserId },
              select: { id: true },
            }
          : false,
        savedPosts: currentUserId
          ? {
              where: { userId: currentUserId },
              select: { id: true },
            }
          : false,
      },
    });

    let nextCursor: string | null = null;
    let items = rawPosts;

    if (rawPosts.length > limit) {
      items = rawPosts.slice(0, limit);
      nextCursor = items[items.length - 1].id;
    }

    const formattedItems = items.map((post: any) =>
      this.formatGroupPostResponse(post, currentUserId),
    );

    return {
      items: formattedItems,
      nextCursor,
    };
  }

  // ==========================================
  // 18. CREATE GROUP POST
  // ==========================================
  async createGroupPost(groupId: string, userId: string, dto: CreateGroupPostDto) {
    const group = await this.db.group.findUnique({
      where: { id: groupId },
    });

    if (!group) {
      throw new NotFoundException(`Group with ID '${groupId}' not found.`);
    }

    // Must be a member to create posts in a group
    await this.assertGroupMember(groupId, userId);

    const postType = dto.type || PostType.TEXT;

    if (postType === PostType.DUA) {
      if (!dto.duaId) {
        throw new BadRequestException('duaId is required when post type is DUA.');
      }
      const duaExists = await this.prisma.dua.findUnique({
        where: { id: dto.duaId },
      });
      if (!duaExists) {
        throw new NotFoundException(`Dua with ID '${dto.duaId}' does not exist.`);
      }
    } else if (!dto.content || !dto.content.trim()) {
      throw new BadRequestException(`Content is required for ${postType} posts.`);
    }

    const post = await this.db.post.create({
      data: {
        authorId: userId,
        groupId,
        type: postType,
        content: dto.content?.trim() || null,
        duaId: dto.duaId || null,
        visibility: PostVisibility.GROUP,
        status: PostStatus.PUBLISHED,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            username: true,
          },
        },
        dua: {
          include: {
            category: true,
            references: {
              include: {
                source: true,
              },
            },
            audios: true,
          },
        },
        _count: {
          select: {
            reactions: true,
            comments: true,
          },
        },
      },
    });

    return this.formatGroupPostResponse(post, userId);
  }

  // ==========================================
  // PERMISSION & MEMBERSHIP HELPERS
  // ==========================================
  async assertGroupOwner(groupId: string, userId: string) {
    const member = await this.db.groupMember.findUnique({
      where: {
        groupId_userId: { groupId, userId },
      },
    });

    if (!member || member.role !== GroupMemberRole.OWNER) {
      throw new ForbiddenException('Only the group owner can perform this action.');
    }

    return member;
  }

  async assertGroupAdmin(groupId: string, userId: string) {
    const member = await this.db.groupMember.findUnique({
      where: {
        groupId_userId: { groupId, userId },
      },
    });

    if (
      !member ||
      (member.role !== GroupMemberRole.OWNER && member.role !== GroupMemberRole.ADMIN)
    ) {
      throw new ForbiddenException('Only group admins or owners can perform this action.');
    }

    return member;
  }

  async assertGroupMember(groupId: string, userId: string) {
    const member = await this.db.groupMember.findUnique({
      where: {
        groupId_userId: { groupId, userId },
      },
    });

    if (!member) {
      throw new ForbiddenException('You must be a member of this group to perform this action.');
    }

    return member;
  }

  async getMembership(groupId: string, userId: string): Promise<GroupMembershipInfo> {
    const member = await this.db.groupMember.findUnique({
      where: {
        groupId_userId: { groupId, userId },
      },
    });

    if (member) {
      return {
        status: member.role as unknown as GroupMembershipStatus,
        role: member.role,
        requestId: null,
      };
    }

    const request = await this.db.groupJoinRequest.findUnique({
      where: {
        groupId_userId: { groupId, userId },
      },
    });

    if (request && request.status === GroupJoinRequestStatus.PENDING) {
      return {
        status: GroupMembershipStatus.PENDING,
        role: null,
        requestId: request.id,
      };
    }

    return {
      status: GroupMembershipStatus.NONE,
      role: null,
      requestId: null,
    };
  }

  private async batchGetMemberships(
    groupIds: string[],
    userId: string,
  ): Promise<Record<string, GroupMembershipInfo>> {
    const map: Record<string, GroupMembershipInfo> = {};

    const [members, requests] = await Promise.all([
      this.db.groupMember.findMany({
        where: {
          groupId: { in: groupIds },
          userId,
        },
      }),
      this.db.groupJoinRequest.findMany({
        where: {
          groupId: { in: groupIds },
          userId,
          status: GroupJoinRequestStatus.PENDING,
        },
      }),
    ]);

    for (const m of members) {
      map[m.groupId] = {
        status: m.role as unknown as GroupMembershipStatus,
        role: m.role,
        requestId: null,
      };
    }

    for (const r of requests) {
      if (!map[r.groupId]) {
        map[r.groupId] = {
          status: GroupMembershipStatus.PENDING,
          role: null,
          requestId: r.id,
        };
      }
    }

    return map;
  }

  private formatGroupDetail(group: any, membership?: GroupMembershipInfo): GroupDetail {
    return {
      id: group.id,
      name: group.name,
      slug: group.slug,
      description: group.description,
      avatarUrl: group.avatarUrl,
      visibility: group.visibility,
      memberCount: group._count?.members || 0,
      membership: membership || {
        status: GroupMembershipStatus.NONE,
        role: null,
        requestId: null,
      },
      createdAt: group.createdAt,
      updatedAt: group.updatedAt,
    };
  }

  private formatGroupPostResponse(post: any, currentUserId?: string): any {
    return {
      id: post.id,
      groupId: post.groupId,
      type: post.type,
      content: post.content,
      createdAt: post.createdAt,
      visibility: post.visibility,
      status: post.status,
      author: {
        id: post.author?.id,
        name: post.author?.name,
        username: post.author?.username,
        avatar: post.author?.avatarUrl || null,
      },
      originalPostId: post.originalPostId || null,
      originalPost: post.originalPost
        ? post.originalPost.status !== PostStatus.PUBLISHED
          ? {
              id: post.originalPost.id,
              isUnavailable: true,
              status: post.originalPost.status,
            }
          : this.formatGroupPostResponse(post.originalPost, currentUserId)
        : post.originalPostId
        ? {
            id: post.originalPostId,
            isUnavailable: true,
          }
        : null,
      bloodRequestId: post.bloodRequestId || null,
      bloodRequest: post.bloodRequest
        ? {
            id: post.bloodRequest.id,
            requesterId: post.bloodRequest.requesterId,
            forMyself: post.bloodRequest.forMyself,
            patientName: post.bloodRequest.patientName,
            patientAge: post.bloodRequest.patientAge,
            problem: post.bloodRequest.problem,
            bloodGroup: post.bloodRequest.bloodGroup,
            units: post.bloodRequest.units,
            unitsFulfilled: post.bloodRequest.unitsFulfilled,
            hospitalName: post.bloodRequest.hospitalName,
            hospitalAddress: post.bloodRequest.hospitalAddress,
            location: post.bloodRequest.location,
            contactNumber: post.bloodRequest.contactNumber,
            alternateContact: post.bloodRequest.alternateContact,
            neededDate: post.bloodRequest.neededDate,
            urgency: post.bloodRequest.urgency,
            status: post.bloodRequest.status,
            note: post.bloodRequest.note,
            createdAt: post.bloodRequest.createdAt,
            requester: post.bloodRequest.requester
              ? {
                  id: post.bloodRequest.requester.id,
                  name: post.bloodRequest.requester.name,
                  username: post.bloodRequest.requester.username,
                  avatarUrl: post.bloodRequest.requester.avatarUrl,
                }
              : null,
            donations: post.bloodRequest.donations || [],
          }
        : post.bloodRequestId
        ? {
            id: post.bloodRequestId,
            isUnavailable: true,
          }
        : null,
      dua: post.dua
        ? {
            id: post.dua.id,
            fadilah: post.dua.fadilah,
            transliteration: post.dua.transliteration,
            meaningBangla: post.dua.meaningBangla,
            arabicText: post.dua.arabicText,
            category: post.dua.category
              ? {
                  id: post.dua.category.id,
                  name: post.dua.category.name,
                  slug: post.dua.category.slug,
                }
              : null,
            references:
              post.dua.references?.map((r: any) => ({
                id: r.id,
                reference: r.reference,
                note: r.note,
                verified: r.verified,
                source: r.source
                  ? {
                      id: r.source.id,
                      name: r.source.name,
                      type: r.source.type,
                    }
                  : null,
              })) || [],
            audios: post.dua.audios || [],
            audioUrl: post.dua.audios?.[0]?.audioUrl || null,
          }
        : post.duaId
        ? {
            id: post.duaId,
            isUnavailable: true,
          }
        : null,
      stats: {
        reactionCount: post._count?.reactions || 0,
        commentCount: post._count?.comments || 0,
        saveCount: post._count?.savedPosts || 0,
        shareCount: (post._count?.shares || 0) + (post._count?.reposts || 0),
      },
      viewer: {
        hasReacted: Array.isArray(post.reactions) ? post.reactions.length > 0 : false,
        hasSaved: Array.isArray(post.savedPosts) ? post.savedPosts.length > 0 : false,
      },
    };
  }
}
