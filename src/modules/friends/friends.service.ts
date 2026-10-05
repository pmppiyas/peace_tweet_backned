import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DEFAULT_FRIENDS_LIMIT } from '../../common/constants';
import { RelationshipStatus } from '../../common/enums/relationship-status.enum';
import { FriendshipStatus } from '../../common/enums/friendship-status.enum';
import {
  FriendshipStatusData,
  PaginatedFriendsResponse,
  PaginatedFriendRequestsResponse,
} from '../../common/interfaces/friend.interface';
import { PrismaService } from '../../database/prisma.service';
import { FriendQueryDto, FriendRequestQueryDto } from './dto/friend-query.dto';

@Injectable()
export class FriendsService {
  constructor(private readonly prisma: PrismaService) {}

  // Send a new friend request or reopen a previously closed one
  async sendRequest(senderId: string, receiverId: string) {
    if (senderId === receiverId) {
      throw new BadRequestException('Cannot send a friend request to yourself.');
    }

    // Verify target user exists
    const receiver = await this.prisma.user.findUnique({
      where: { id: receiverId },
      select: { id: true },
    });

    if (!receiver) {
      throw new NotFoundException(`User with ID '${receiverId}' not found.`);
    }

    // Check existing relationship between these two users (in either direction)
    const existing = await this.prisma.friendship.findFirst({
      where: {
        OR: [
          { senderId, receiverId },
          { senderId: receiverId, receiverId: senderId },
        ],
      },
    });

    if (existing) {
      if (existing.status === FriendshipStatus.ACCEPTED) {
        throw new ConflictException('You are already friends with this user.');
      }

      if (existing.status === FriendshipStatus.PENDING) {
        if (existing.senderId === senderId) {
          throw new ConflictException('A friend request to this user is already pending.');
        } else {
          throw new ConflictException(
            'This user has already sent you a friend request. Please accept their request.',
          );
        }
      }

      // If previously REJECTED or CANCELLED, reopen as PENDING
      const updated = await this.prisma.friendship.update({
        where: { id: existing.id },
        data: {
          senderId,
          receiverId,
          status: FriendshipStatus.PENDING,
        },
        include: {
          receiver: {
            select: {
              id: true,
              name: true,
              username: true,
              avatarUrl: true,
            },
          },
        },
      });

      if (receiverId !== senderId) {
        await this.prisma.notification.create({
          data: {
            recipientId: receiverId,
            actorId: senderId,
            type: 'FRIEND_REQUEST' as any,
            message: 'sent you a friend request.',
            entityId: updated.id,
            entityType: 'FRIEND_REQUEST',
          },
        }).catch((e: any) => console.error('Notification error on friend request:', e));
      }

      return {
        id: updated.id,
        status: updated.status,
        createdAt: updated.createdAt,
        receiver: {
          id: updated.receiver.id,
          name: updated.receiver.name,
          username: updated.receiver.username,
          avatar: updated.receiver.avatarUrl || null,
        },
      };
    }

    // Atomically create new friendship request
    const request = await this.prisma.friendship.create({
      data: {
        senderId,
        receiverId,
        status: FriendshipStatus.PENDING,
      },
      include: {
        receiver: {
          select: {
            id: true,
            name: true,
            username: true,
            avatarUrl: true,
          },
        },
      },
    });

    if (receiverId !== senderId) {
      await this.prisma.notification.create({
        data: {
          recipientId: receiverId,
          actorId: senderId,
          type: 'FRIEND_REQUEST' as any,
          message: 'sent you a friend request.',
          entityId: request.id,
          entityType: 'FRIEND_REQUEST',
        },
      }).catch((e: any) => console.error('Notification error on friend request:', e));
    }

    return {
      id: request.id,
      status: request.status,
      createdAt: request.createdAt,
      receiver: {
        id: request.receiver.id,
        name: request.receiver.name,
        username: request.receiver.username,
        avatar: request.receiver.avatarUrl || null,
      },
    };
  }

  // Cancel a pending friend request sent by the current user
  async cancelRequest(requestId: string, senderId: string) {
    let request = await this.prisma.friendship.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      request = await this.prisma.friendship.findFirst({
        where: {
          senderId,
          receiverId: requestId,
          status: FriendshipStatus.PENDING,
        },
      });
    }

    if (!request) {
      return {
        success: true,
        message: 'Friend request cancelled successfully.',
      };
    }

    if (request.senderId !== senderId) {
      throw new ForbiddenException('You can only cancel requests sent by you.');
    }

    await this.prisma.friendship.delete({
      where: { id: request.id },
    });

    return {
      success: true,
      message: 'Friend request cancelled successfully.',
    };
  }

  // Accept a received pending friend request
  async acceptRequest(requestId: string, receiverId: string) {
    let request = await this.prisma.friendship.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      request = await this.prisma.friendship.findFirst({
        where: {
          receiverId,
          senderId: requestId,
          status: FriendshipStatus.PENDING,
        },
      });
    }

    if (!request) {
      throw new NotFoundException('Friend request not found.');
    }

    if (request.receiverId !== receiverId) {
      throw new ForbiddenException('You can only accept friend requests sent to you.');
    }

    if (request.status === FriendshipStatus.ACCEPTED) {
      return {
        success: true,
        message: 'Friend request accepted successfully.',
      };
    }

    if (request.status !== FriendshipStatus.PENDING) {
      throw new BadRequestException('Only pending friend requests can be accepted.');
    }

    // Atomically transition status to ACCEPTED
    await this.prisma.friendship.update({
      where: { id: request.id },
      data: {
        status: FriendshipStatus.ACCEPTED,
      },
    });

    if (request.senderId !== receiverId) {
      await this.prisma.notification.create({
        data: {
          recipientId: request.senderId,
          actorId: receiverId,
          type: 'FRIEND_ACCEPT' as any,
          message: 'accepted your friend request.',
          entityId: request.id,
          entityType: 'FRIEND_REQUEST',
        },
      }).catch((e: any) => console.error('Notification error on friend accept:', e));
    }

    return {
      success: true,
      message: 'Friend request accepted successfully.',
    };
  }

  // Reject a received pending friend request
  async rejectRequest(requestId: string, receiverId: string) {
    let request = await this.prisma.friendship.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      request = await this.prisma.friendship.findFirst({
        where: {
          receiverId,
          senderId: requestId,
          status: FriendshipStatus.PENDING,
        },
      });
    }

    if (!request) {
      return {
        success: true,
        message: 'Friend request rejected successfully.',
      };
    }

    if (request.receiverId !== receiverId) {
      throw new ForbiddenException('You can only reject friend requests sent to you.');
    }

    // Cleanly delete the request on rejection
    await this.prisma.friendship.delete({
      where: { id: request.id },
    });

    return {
      success: true,
      message: 'Friend request rejected successfully.',
    };
  }

  // Retrieve received pending friend requests with cursor pagination
  async getReceivedRequests(
    userId: string,
    query: FriendRequestQueryDto,
  ): Promise<PaginatedFriendRequestsResponse> {
    const limit = query.limit || DEFAULT_FRIENDS_LIMIT;

    const requests: any[] = await this.prisma.friendship.findMany({
      where: {
        receiverId: userId,
        status: FriendshipStatus.PENDING,
      },
      take: limit + 1,
      ...(query.cursor
        ? {
            cursor: { id: query.cursor },
            skip: 1,
          }
        : {}),
      orderBy: { createdAt: 'desc' },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            username: true,
            avatarUrl: true,
          },
        },
      },
    });

    let nextCursor: string | null = null;
    if (requests.length > limit) {
      requests.pop();
      nextCursor = requests[requests.length - 1]?.id || null;
    }

    const items = requests.map((req: any) => ({
      id: req.id,
      status: req.status,
      createdAt: req.createdAt,
      sender: {
        id: req.sender.id,
        name: req.sender.name,
        username: req.sender.username,
        avatar: req.sender.avatarUrl || null,
      },
    }));

    return {
      items,
      nextCursor,
    };
  }

  // Retrieve sent pending friend requests with cursor pagination
  async getSentRequests(
    userId: string,
    query: FriendRequestQueryDto,
  ): Promise<PaginatedFriendRequestsResponse> {
    const limit = query.limit || DEFAULT_FRIENDS_LIMIT;

    const requests: any[] = await this.prisma.friendship.findMany({
      where: {
        senderId: userId,
        status: FriendshipStatus.PENDING,
      },
      take: limit + 1,
      ...(query.cursor
        ? {
            cursor: { id: query.cursor },
            skip: 1,
          }
        : {}),
      orderBy: { createdAt: 'desc' },
      include: {
        receiver: {
          select: {
            id: true,
            name: true,
            username: true,
            avatarUrl: true,
          },
        },
      },
    });

    let nextCursor: string | null = null;
    if (requests.length > limit) {
      requests.pop();
      nextCursor = requests[requests.length - 1]?.id || null;
    }

    const items = requests.map((req: any) => ({
      id: req.id,
      status: req.status,
      createdAt: req.createdAt,
      receiver: {
        id: req.receiver.id,
        name: req.receiver.name,
        username: req.receiver.username,
        avatar: req.receiver.avatarUrl || null,
      },
    }));

    return {
      items,
      nextCursor,
    };
  }

  // Retrieve user's friends list with search and cursor pagination
  async getFriends(userId: string, query: FriendQueryDto): Promise<PaginatedFriendsResponse> {
    const limit = query.limit || DEFAULT_FRIENDS_LIMIT;
    const searchFilter = query.search?.trim();

    const where: any = {
      status: FriendshipStatus.ACCEPTED,
      OR: [
        { senderId: userId },
        { receiverId: userId },
      ],
    };

    if (searchFilter) {
      where.AND = [
        {
          OR: [
            {
              senderId: userId,
              receiver: {
                OR: [
                  { name: { contains: searchFilter, mode: 'insensitive' } },
                  { username: { contains: searchFilter, mode: 'insensitive' } },
                ],
              },
            },
            {
              receiverId: userId,
              sender: {
                OR: [
                  { name: { contains: searchFilter, mode: 'insensitive' } },
                  { username: { contains: searchFilter, mode: 'insensitive' } },
                ],
              },
            },
          ],
        },
      ];
    }

    const friendships: any[] = await this.prisma.friendship.findMany({
      where,
      take: limit + 1,
      ...(query.cursor
        ? {
            cursor: { id: query.cursor },
            skip: 1,
          }
        : {}),
      orderBy: { updatedAt: 'desc' },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            username: true,
            avatarUrl: true,
          },
        },
        receiver: {
          select: {
            id: true,
            name: true,
            username: true,
            avatarUrl: true,
          },
        },
      },
    });

    let nextCursor: string | null = null;
    if (friendships.length > limit) {
      friendships.pop();
      nextCursor = friendships[friendships.length - 1]?.id || null;
    }

    const items = friendships.map((f: any) => {
      const isSender = f.senderId === userId;
      const friendUser = isSender ? f.receiver : f.sender;
      return {
        id: f.id,
        friendId: friendUser.id,
        friendSince: f.updatedAt || f.createdAt,
        user: {
          id: friendUser.id,
          name: friendUser.name,
          username: friendUser.username,
          avatar: friendUser.avatarUrl || null,
        },
      };
    });

    return {
      items,
      nextCursor,
    };
  }

  // Unfriend / remove friend inside a transaction
  async unfriend(currentUserId: string, targetUserId: string) {
    if (currentUserId === targetUserId) {
      throw new BadRequestException('Cannot remove yourself as a friend.');
    }

    const targetUser = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true },
    });

    if (!targetUser) {
      throw new NotFoundException(`User with ID '${targetUserId}' not found.`);
    }

    const friendship = await this.prisma.friendship.findFirst({
      where: {
        status: FriendshipStatus.ACCEPTED,
        OR: [
          { senderId: currentUserId, receiverId: targetUserId },
          { senderId: targetUserId, receiverId: currentUserId },
        ],
      },
    });

    if (!friendship) {
      throw new NotFoundException('Friendship does not exist.');
    }

    await this.prisma.friendship.delete({
      where: { id: friendship.id },
    });

    return {
      success: true,
      message: 'Friend removed successfully.',
    };
  }

  // Compute relationship status between viewer and target user
  async getRelationshipStatus(
    viewerId: string | undefined,
    targetUserId: string,
  ): Promise<FriendshipStatusData> {
    if (!viewerId) {
      return {
        status: RelationshipStatus.NONE,
        requestId: null,
      };
    }

    if (viewerId === targetUserId) {
      return {
        status: RelationshipStatus.SELF,
        requestId: null,
      };
    }

    // Check relationship in the unified friendship table with 1 query
    const relationship = await this.prisma.friendship.findFirst({
      where: {
        OR: [
          { senderId: viewerId, receiverId: targetUserId },
          { senderId: targetUserId, receiverId: viewerId },
        ],
      },
    });

    if (!relationship) {
      return {
        status: RelationshipStatus.NONE,
        requestId: null,
      };
    }

    if (relationship.status === FriendshipStatus.ACCEPTED) {
      return {
        status: RelationshipStatus.FRIENDS,
        requestId: null,
      };
    }

    if (relationship.status === FriendshipStatus.PENDING) {
      if (relationship.senderId === viewerId) {
        return {
          status: RelationshipStatus.PENDING_SENT,
          requestId: relationship.id,
        };
      } else {
        return {
          status: RelationshipStatus.PENDING_RECEIVED,
          requestId: relationship.id,
        };
      }
    }

    return {
      status: RelationshipStatus.NONE,
      requestId: null,
    };
  }
}
