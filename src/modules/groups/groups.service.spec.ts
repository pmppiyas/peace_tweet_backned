import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { GroupJoinRequestStatus } from '../../common/enums/group-join-request-status.enum';
import { GroupMemberRole } from '../../common/enums/group-member-role.enum';
import { GroupMembershipStatus } from '../../common/enums/group-membership-status.enum';
import { GroupVisibility } from '../../common/enums/group-visibility.enum';
import { PostStatus } from '../../common/enums/post-status.enum';
import { PostType } from '../../common/enums/post-type.enum';
import { PostVisibility } from '../../common/enums/post-visibility.enum';
import { PrismaService } from '../../database/prisma.service';
import { GroupsService } from './groups.service';

describe('GroupsService', () => {
  let service: GroupsService;
  let prisma: any;

  const mockUser1 = { id: 'user-1', name: 'User One', username: 'user1' };
  const mockUser2 = { id: 'user-2', name: 'User Two', username: 'user2' };
  const mockUser3 = { id: 'user-3', name: 'User Three', username: 'user3' };

  const mockPublicGroup = {
    id: 'group-1',
    name: 'Islamic Knowledge',
    slug: 'islamic-knowledge',
    description: 'A public community',
    avatarUrl: null,
    visibility: GroupVisibility.PUBLIC,
    createdAt: new Date(),
    updatedAt: new Date(),
    _count: { members: 5 },
  };

  const mockPrivateGroup = {
    id: 'group-2',
    name: 'Private Scholars',
    slug: 'private-scholars',
    description: 'A private group',
    avatarUrl: null,
    visibility: GroupVisibility.PRIVATE,
    createdAt: new Date(),
    updatedAt: new Date(),
    _count: { members: 3 },
  };

  beforeEach(async () => {
    prisma = {
      group: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      groupMember: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        upsert: jest.fn(),
      },
      groupJoinRequest: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        upsert: jest.fn(),
      },
      post: {
        findMany: jest.fn(),
        create: jest.fn(),
      },
      dua: {
        findUnique: jest.fn(),
      },
      $transaction: jest.fn((callbackOrArray) => {
        if (typeof callbackOrArray === 'function') {
          return callbackOrArray(prisma);
        }
        return Promise.all(callbackOrArray);
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GroupsService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    service = module.get<GroupsService>(GroupsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ==========================================
  // CREATE GROUP
  // ==========================================
  describe('createGroup', () => {
    it('should create a group and assign creator as OWNER in a transaction', async () => {
      prisma.group.findUnique.mockResolvedValue(null);
      prisma.group.create.mockResolvedValue({
        ...mockPublicGroup,
        id: 'new-group-id',
      });
      prisma.groupMember.create.mockResolvedValue({
        id: 'member-1',
        groupId: 'new-group-id',
        userId: mockUser1.id,
        role: GroupMemberRole.OWNER,
      });

      const result = await service.createGroup(mockUser1.id, {
        name: 'Islamic Knowledge',
        slug: 'islamic-knowledge',
        visibility: GroupVisibility.PUBLIC,
      });

      expect(result.slug).toBe('islamic-knowledge');
      expect(result.membership?.status).toBe(GroupMembershipStatus.OWNER);
      expect(prisma.group.create).toHaveBeenCalled();
      expect(prisma.groupMember.create).toHaveBeenCalledWith({
        data: {
          groupId: 'new-group-id',
          userId: mockUser1.id,
          role: GroupMemberRole.OWNER,
        },
      });
    });

    it('should throw ConflictException if slug already exists', async () => {
      prisma.group.findUnique.mockResolvedValue(mockPublicGroup);

      await expect(
        service.createGroup(mockUser1.id, {
          name: 'Islamic Knowledge',
          slug: 'islamic-knowledge',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  // ==========================================
  // UPDATE GROUP
  // ==========================================
  describe('updateGroup', () => {
    it('should allow OWNER to update group details', async () => {
      prisma.group.findUnique.mockResolvedValueOnce(mockPublicGroup).mockResolvedValueOnce(null);
      prisma.groupMember.findUnique.mockResolvedValue({
        id: 'm1',
        groupId: mockPublicGroup.id,
        userId: mockUser1.id,
        role: GroupMemberRole.OWNER,
      });
      prisma.group.update.mockResolvedValue({
        ...mockPublicGroup,
        name: 'Updated Name',
      });

      const result = await service.updateGroup(mockPublicGroup.id, mockUser1.id, {
        name: 'Updated Name',
      });

      expect(result.name).toBe('Updated Name');
    });

    it('should throw ForbiddenException if regular member tries to update', async () => {
      prisma.group.findUnique.mockResolvedValue(mockPublicGroup);
      prisma.groupMember.findUnique.mockResolvedValue({
        id: 'm1',
        groupId: mockPublicGroup.id,
        userId: mockUser2.id,
        role: GroupMemberRole.MEMBER,
      });

      await expect(
        service.updateGroup(mockPublicGroup.id, mockUser2.id, { name: 'Hack' }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ==========================================
  // DELETE GROUP
  // ==========================================
  describe('deleteGroup', () => {
    it('should allow OWNER to delete group', async () => {
      prisma.group.findUnique.mockResolvedValue(mockPublicGroup);
      prisma.groupMember.findUnique.mockResolvedValue({
        id: 'm1',
        groupId: mockPublicGroup.id,
        userId: mockUser1.id,
        role: GroupMemberRole.OWNER,
      });
      prisma.group.delete.mockResolvedValue(mockPublicGroup);

      const result = await service.deleteGroup(mockPublicGroup.id, mockUser1.id);
      expect(result.success).toBe(true);
      expect(prisma.group.delete).toHaveBeenCalledWith({
        where: { id: mockPublicGroup.id },
      });
    });

    it('should throw ForbiddenException if ADMIN tries to delete group', async () => {
      prisma.group.findUnique.mockResolvedValue(mockPublicGroup);
      prisma.groupMember.findUnique.mockResolvedValue({
        id: 'm2',
        groupId: mockPublicGroup.id,
        userId: mockUser2.id,
        role: GroupMemberRole.ADMIN,
      });

      await expect(service.deleteGroup(mockPublicGroup.id, mockUser2.id)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  // ==========================================
  // JOIN PUBLIC & PRIVATE GROUPS
  // ==========================================
  describe('joinGroup', () => {
    it('should join public group directly as MEMBER', async () => {
      prisma.group.findUnique.mockResolvedValue(mockPublicGroup);
      prisma.groupMember.findUnique.mockResolvedValue(null);
      prisma.groupMember.create.mockResolvedValue({
        id: 'm-new',
        groupId: mockPublicGroup.id,
        userId: mockUser2.id,
        role: GroupMemberRole.MEMBER,
      });

      const result = await service.joinGroup(mockPublicGroup.id, mockUser2.id);
      expect(result.success).toBe(true);
      expect(result.status).toBe(GroupMembershipStatus.MEMBER);
      expect(prisma.groupMember.create).toHaveBeenCalled();
    });

    it('should create a PENDING join request for private group', async () => {
      prisma.group.findUnique.mockResolvedValue(mockPrivateGroup);
      prisma.groupMember.findUnique.mockResolvedValue(null);
      prisma.groupJoinRequest.findUnique.mockResolvedValue(null);
      prisma.groupJoinRequest.upsert.mockResolvedValue({
        id: 'req-1',
        groupId: mockPrivateGroup.id,
        userId: mockUser2.id,
        status: GroupJoinRequestStatus.PENDING,
      });

      const result = await service.joinGroup(mockPrivateGroup.id, mockUser2.id);
      expect(result.success).toBe(true);
      expect(result.status).toBe(GroupMembershipStatus.PENDING);
      expect(result.requestId).toBe('req-1');
    });

    it('should throw ConflictException if already a member', async () => {
      prisma.group.findUnique.mockResolvedValue(mockPublicGroup);
      prisma.groupMember.findUnique.mockResolvedValue({
        id: 'm-exist',
        groupId: mockPublicGroup.id,
        userId: mockUser2.id,
        role: GroupMemberRole.MEMBER,
      });

      await expect(service.joinGroup(mockPublicGroup.id, mockUser2.id)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should throw ConflictException if join request is already pending', async () => {
      prisma.group.findUnique.mockResolvedValue(mockPrivateGroup);
      prisma.groupMember.findUnique.mockResolvedValue(null);
      prisma.groupJoinRequest.findUnique.mockResolvedValue({
        id: 'req-exist',
        groupId: mockPrivateGroup.id,
        userId: mockUser2.id,
        status: GroupJoinRequestStatus.PENDING,
      });

      await expect(service.joinGroup(mockPrivateGroup.id, mockUser2.id)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  // ==========================================
  // CANCEL JOIN REQUEST & LEAVE GROUP
  // ==========================================
  describe('cancelJoinRequest and leaveGroup', () => {
    it('should cancel pending join request successfully', async () => {
      prisma.groupJoinRequest.findUnique.mockResolvedValue({
        id: 'req-1',
        groupId: mockPrivateGroup.id,
        userId: mockUser2.id,
        status: GroupJoinRequestStatus.PENDING,
      });
      prisma.groupJoinRequest.update.mockResolvedValue({
        id: 'req-1',
        status: GroupJoinRequestStatus.CANCELLED,
      });

      const result = await service.cancelJoinRequest(mockPrivateGroup.id, mockUser2.id);
      expect(result.success).toBe(true);
    });

    it('should allow regular member to leave group', async () => {
      prisma.groupMember.findUnique.mockResolvedValue({
        id: 'm2',
        groupId: mockPublicGroup.id,
        userId: mockUser2.id,
        role: GroupMemberRole.MEMBER,
      });
      prisma.groupMember.delete.mockResolvedValue({});

      const result = await service.leaveGroup(mockPublicGroup.id, mockUser2.id);
      expect(result.success).toBe(true);
      expect(prisma.groupMember.delete).toHaveBeenCalledWith({
        where: { id: 'm2' },
      });
    });

    it('should prevent OWNER from leaving group directly', async () => {
      prisma.groupMember.findUnique.mockResolvedValue({
        id: 'm1',
        groupId: mockPublicGroup.id,
        userId: mockUser1.id,
        role: GroupMemberRole.OWNER,
      });

      await expect(service.leaveGroup(mockPublicGroup.id, mockUser1.id)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ==========================================
  // JOIN REQUESTS MANAGEMENT
  // ==========================================
  describe('join requests approval/rejection', () => {
    it('should allow ADMIN to accept join request and create GroupMember', async () => {
      prisma.groupMember.findUnique.mockResolvedValue({
        id: 'm-admin',
        groupId: mockPrivateGroup.id,
        userId: mockUser1.id,
        role: GroupMemberRole.ADMIN,
      });
      prisma.groupJoinRequest.findUnique.mockResolvedValue({
        id: 'req-1',
        groupId: mockPrivateGroup.id,
        userId: mockUser2.id,
        status: GroupJoinRequestStatus.PENDING,
      });

      const result = await service.acceptJoinRequest(mockPrivateGroup.id, 'req-1', mockUser1.id);
      expect(result.success).toBe(true);
      expect(prisma.groupMember.upsert).toHaveBeenCalled();
      expect(prisma.groupJoinRequest.update).toHaveBeenCalled();
    });

    it('should allow ADMIN to reject join request', async () => {
      prisma.groupMember.findUnique.mockResolvedValue({
        id: 'm-admin',
        groupId: mockPrivateGroup.id,
        userId: mockUser1.id,
        role: GroupMemberRole.ADMIN,
      });
      prisma.groupJoinRequest.findUnique.mockResolvedValue({
        id: 'req-1',
        groupId: mockPrivateGroup.id,
        userId: mockUser2.id,
        status: GroupJoinRequestStatus.PENDING,
      });

      const result = await service.rejectJoinRequest(mockPrivateGroup.id, 'req-1', mockUser1.id);
      expect(result.success).toBe(true);
      expect(prisma.groupJoinRequest.update).toHaveBeenCalledWith({
        where: { id: 'req-1' },
        data: { status: GroupJoinRequestStatus.REJECTED },
      });
    });

    it('should throw ForbiddenException if regular member tries to accept request', async () => {
      prisma.groupMember.findUnique.mockResolvedValue({
        id: 'm-regular',
        groupId: mockPrivateGroup.id,
        userId: mockUser3.id,
        role: GroupMemberRole.MEMBER,
      });

      await expect(
        service.acceptJoinRequest(mockPrivateGroup.id, 'req-1', mockUser3.id),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ==========================================
  // REMOVE MEMBER & CHANGE ROLE
  // ==========================================
  describe('removeMember & changeMemberRole', () => {
    it('should allow OWNER to remove a member', async () => {
      prisma.groupMember.findUnique
        .mockResolvedValueOnce({
          id: 'm-owner',
          groupId: mockPublicGroup.id,
          userId: mockUser1.id,
          role: GroupMemberRole.OWNER,
        })
        .mockResolvedValueOnce({
          id: 'm-target',
          groupId: mockPublicGroup.id,
          userId: mockUser2.id,
          role: GroupMemberRole.MEMBER,
        });

      const result = await service.removeMember(mockPublicGroup.id, mockUser2.id, mockUser1.id);
      expect(result.success).toBe(true);
      expect(prisma.groupMember.delete).toHaveBeenCalledWith({
        where: { id: 'm-target' },
      });
    });

    it('should prevent removing the OWNER', async () => {
      prisma.groupMember.findUnique
        .mockResolvedValueOnce({
          id: 'm-admin',
          groupId: mockPublicGroup.id,
          userId: mockUser2.id,
          role: GroupMemberRole.ADMIN,
        })
        .mockResolvedValueOnce({
          id: 'm-owner',
          groupId: mockPublicGroup.id,
          userId: mockUser1.id,
          role: GroupMemberRole.OWNER,
        });

      await expect(
        service.removeMember(mockPublicGroup.id, mockUser1.id, mockUser2.id),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should prevent assigning OWNER via changeMemberRole', async () => {
      await expect(
        service.changeMemberRole(
          mockPublicGroup.id,
          mockUser2.id,
          GroupMemberRole.OWNER,
          mockUser1.id,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ==========================================
  // GROUP POSTS
  // ==========================================
  describe('group posts', () => {
    it('should allow a group member to create a post in group', async () => {
      prisma.group.findUnique.mockResolvedValue(mockPublicGroup);
      prisma.groupMember.findUnique.mockResolvedValue({
        id: 'm1',
        groupId: mockPublicGroup.id,
        userId: mockUser1.id,
        role: GroupMemberRole.MEMBER,
      });
      prisma.post.create.mockResolvedValue({
        id: 'post-1',
        authorId: mockUser1.id,
        groupId: mockPublicGroup.id,
        type: PostType.TEXT,
        content: 'Hello group',
        visibility: PostVisibility.GROUP,
        status: PostStatus.PUBLISHED,
        createdAt: new Date(),
        author: mockUser1,
        dua: null,
        _count: { reactions: 0, comments: 0 },
      });

      const result = await service.createGroupPost(mockPublicGroup.id, mockUser1.id, {
        content: 'Hello group',
      });
      expect(result.content).toBe('Hello group');
      expect(result.groupId).toBe(mockPublicGroup.id);
    });

    it('should prevent non-members from creating a post in group', async () => {
      prisma.group.findUnique.mockResolvedValue(mockPublicGroup);
      prisma.groupMember.findUnique.mockResolvedValue(null);

      await expect(
        service.createGroupPost(mockPublicGroup.id, mockUser2.id, {
          content: 'Unauthorized post',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should hide private group posts from non-members', async () => {
      prisma.group.findUnique.mockResolvedValue(mockPrivateGroup);
      prisma.groupMember.findUnique.mockResolvedValue(null);

      await expect(service.getGroupPosts(mockPrivateGroup.id, {}, mockUser2.id)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });
});
