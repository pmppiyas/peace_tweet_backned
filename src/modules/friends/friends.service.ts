import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DEFAULT_FRIENDS_LIMIT } from '../../common/constants';
import { RelationshipStatus } from '../../common/enums/relationship-status.enum';
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

    // Verify users are not already friends
    const existingFriendship = await this.prisma.friendship.findUnique({
      where: {
        userId_friendId: {
          userId: senderId,
          friendId: receiverId,
        },
      },
    });

    if (existingFriendship) {
      throw new ConflictException('You are already friends with this user.');
    }

    // Check if sender already sent a pending request
    const pendingSent = await this.prisma.friendRequest.findFirst({
      where: {
        senderId,
        receiverId,
        status: 'PENDING' as any,
      },
    });

    if (pendingSent) {
      throw new ConflictException('A friend request to this user is already pending.');
    }

    // Check if receiver already sent a pending request to sender
    const pendingReceived = await this.prisma.friendRequest.findFirst({
      where: {
        senderId: receiverId,
        receiverId: senderId,
        status: 'PENDING' as any,
      },
    });

    if (pendingReceived) {
      throw new ConflictException(
        'This user has already sent you a friend request. Please accept their request.',
      );
    }

    // Check if a previous inactive request exists between these users
    const previousRequest = await this.prisma.friendRequest.findFirst({
      where: {
        senderId,
        receiverId,
      },
    });

    let request: any;
    if (previousRequest) {
      request = await this.prisma.friendRequest.update({
        where: { id: previousRequest.id },
        data: {
          status: 'PENDING' as any,
        },
        include: {
          receiver: {
            select: {
              id: true,
              name: true,
              username: true,
            },
          },
        },
      });
    } else {
      request = await this.prisma.friendRequest.create({
        data: {
          senderId,
          receiverId,
          status: 'PENDING' as any,
        },
        include: {
          receiver: {
            select: {
              id: true,
              name: true,
              username: true,
            },
          },
        },
      });
    }

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
        avatar: null,
      },
    };
  }

  // Cancel a pending friend request sent by the current user
  async cancelRequest(requestId: string, senderId: string) {
    const request = await this.prisma.friendRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      throw new NotFoundException('Friend request not found.');
    }

    if (request.senderId !== senderId) {
      throw new ForbiddenException('You can only cancel friend requests sent by you.');
    }

    if (request.status !== 'PENDING') {
      throw new BadRequestException('Only pending friend requests can be cancelled.');
    }

    await this.prisma.friendRequest.update({
      where: { id: requestId },
      data: {
        status: 'CANCELLED' as any,
      },
    });

    return {
      success: true,
      message: 'Friend request cancelled successfully.',
    };
  }

  // Accept a received pending friend request inside a database transaction
  async acceptRequest(requestId: string, receiverId: string) {
    const request = await this.prisma.friendRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      throw new NotFoundException('Friend request not found.');
    }

    if (request.receiverId !== receiverId) {
      throw new ForbiddenException('You can only accept friend requests sent to you.');
    }

    if (request.status !== 'PENDING') {
      throw new BadRequestException('Only pending friend requests can be accepted.');
    }

    await this.prisma.$transaction(async (tx: any) => {
      await tx.friendRequest.update({
        where: { id: requestId },
        data: {
          status: 'ACCEPTED' as any,
        },
      });

      // 2. Insert bidirectional friendship records
      await tx.friendship.upsert({
        where: {
          userId_friendId: {
            userId: request.senderId,
            friendId: request.receiverId,
          },
        },
        create: {
          userId: request.senderId,
          friendId: request.receiverId,
        },
        update: {},
      });

      await tx.friendship.upsert({
        where: {
          userId_friendId: {
            userId: request.receiverId,
            friendId: request.senderId,
          },
        },
        create: {
          userId: request.receiverId,
          friendId: request.senderId,
        },
        update: {},
      });

      // 3. Mark any duplicate pending requests between these two users as ACCEPTED
      await tx.friendRequest.updateMany({
        where: {
          OR: [
            { senderId: request.senderId, receiverId: request.receiverId },
            { senderId: request.receiverId, receiverId: request.senderId },
          ],
          status: 'PENDING' as any,
        },
        data: {
          status: 'ACCEPTED' as any,
        },
      });
    });

    if (request.senderId !== receiverId) {
      await this.prisma.notification.create({
        data: {
          recipientId: request.senderId,
          actorId: receiverId,
          type: 'FRIEND_ACCEPT' as any,
          message: 'accepted your friend request.',
          entityId: requestId,
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
    const request = await this.prisma.friendRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      throw new NotFoundException('Friend request not found.');
    }

    if (request.receiverId !== receiverId) {
      throw new ForbiddenException('You can only reject friend requests sent to you.');
    }

    if (request.status !== 'PENDING') {
      throw new BadRequestException('Only pending friend requests can be rejected.');
    }

    await this.prisma.friendRequest.update({
      where: { id: requestId },
      data: {
        status: 'REJECTED' as any,
      },
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

    const requests: any[] = await this.prisma.friendRequest.findMany({
      where: {
        receiverId: userId,
        status: 'PENDING' as any,
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
        avatar: null,
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

    const requests: any[] = await this.prisma.friendRequest.findMany({
      where: {
        senderId: userId,
        status: 'PENDING' as any,
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
        avatar: null,
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

    const friendships: any[] = await this.prisma.friendship.findMany({
      where: {
        userId,
        ...(searchFilter
          ? {
              friend: {
                OR: [
                  { name: { contains: searchFilter, mode: 'insensitive' } },
                  { username: { contains: searchFilter, mode: 'insensitive' } },
                ],
              },
            }
          : {}),
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
        friend: {
          select: {
            id: true,
            name: true,
            username: true,
          },
        },
      },
    });

    let nextCursor: string | null = null;
    if (friendships.length > limit) {
      friendships.pop();
      nextCursor = friendships[friendships.length - 1]?.id || null;
    }

    const items = friendships.map((f: any) => ({
      id: f.id,
      friendId: f.friendId,
      friendSince: f.createdAt,
      user: {
        id: f.friend.id,
        name: f.friend.name,
        username: f.friend.username,
        avatar: null,
      },
    }));

    return {
      items,
      nextCursor,
    };
  }

  // Unfriend / remove friend bidirectionally inside a transaction
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

    const friendship = await this.prisma.friendship.findUnique({
      where: {
        userId_friendId: {
          userId: currentUserId,
          friendId: targetUserId,
        },
      },
    });

    if (!friendship) {
      throw new NotFoundException('Friendship does not exist.');
    }

    await this.prisma.$transaction([
      this.prisma.friendship.deleteMany({
        where: {
          OR: [
            { userId: currentUserId, friendId: targetUserId },
            { userId: targetUserId, friendId: currentUserId },
          ],
        },
      }),
    ]);

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

    // Check if friendship exists
    const friendship = await this.prisma.friendship.findUnique({
      where: {
        userId_friendId: {
          userId: viewerId,
          friendId: targetUserId,
        },
      },
    });

    if (friendship) {
      return {
        status: RelationshipStatus.FRIENDS,
        requestId: null,
      };
    }

    // Check if viewer sent a pending request
    const sentRequest = await this.prisma.friendRequest.findFirst({
      where: {
        senderId: viewerId,
        receiverId: targetUserId,
        status: 'PENDING' as any,
      },
    });

    if (sentRequest) {
      return {
        status: RelationshipStatus.PENDING_SENT,
        requestId: sentRequest.id,
      };
    }

    // Check if target sent a pending request to viewer
    const receivedRequest = await this.prisma.friendRequest.findFirst({
      where: {
        senderId: targetUserId,
        receiverId: viewerId,
        status: 'PENDING' as any,
      },
    });

    if (receivedRequest) {
      return {
        status: RelationshipStatus.PENDING_RECEIVED,
        requestId: receivedRequest.id,
      };
    }

    return {
      status: RelationshipStatus.NONE,
      requestId: null,
    };
  }
}
