import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { RelationshipStatus } from '../../common/enums/relationship-status.enum';
import { PrismaService } from '../../database/prisma.service';
import { FriendsService } from './friends.service';

describe('FriendsService', () => {
  let service: FriendsService;
  let prisma: any;

  const mockUser1 = { id: 'user-1', name: 'User One', username: 'user1' };
  const mockUser2 = { id: 'user-2', name: 'User Two', username: 'user2' };

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn(),
      },
      friendRequest: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      friendship: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        upsert: jest.fn(),
        deleteMany: jest.fn(),
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
        FriendsService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    service = module.get<FriendsService>(FriendsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('sendRequest', () => {
    it('should throw BadRequestException when sending request to oneself', async () => {
      await expect(service.sendRequest('user-1', 'user-1')).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if receiver does not exist', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.sendRequest('user-1', 'user-2')).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException if already friends', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser2);
      prisma.friendship.findUnique.mockResolvedValue({ id: 'f-1' });

      await expect(service.sendRequest('user-1', 'user-2')).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException if direct pending request already exists', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser2);
      prisma.friendship.findUnique.mockResolvedValue(null);
      prisma.friendRequest.findFirst.mockResolvedValueOnce({ id: 'req-1', status: 'PENDING' });

      await expect(service.sendRequest('user-1', 'user-2')).rejects.toThrow(
        'A friend request to this user is already pending.',
      );
    });

    it('should throw ConflictException if reverse pending request already exists', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser2);
      prisma.friendship.findUnique.mockResolvedValue(null);
      prisma.friendRequest.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 'req-2', status: 'PENDING' });

      await expect(service.sendRequest('user-1', 'user-2')).rejects.toThrow(
        'This user has already sent you a friend request. Please accept their request.',
      );
    });

    it('should create new friend request when no prior request exists', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser2);
      prisma.friendship.findUnique.mockResolvedValue(null);
      prisma.friendRequest.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);

      const created = {
        id: 'req-1',
        status: 'PENDING',
        createdAt: new Date(),
        receiver: mockUser2,
      };
      prisma.friendRequest.create.mockResolvedValue(created);

      const result = await service.sendRequest('user-1', 'user-2');
      expect(result.id).toEqual('req-1');
      expect(result.receiver.username).toEqual('user2');
      expect(prisma.friendRequest.create).toHaveBeenCalled();
    });

    it('should reopen previous cancelled/rejected request', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser2);
      prisma.friendship.findUnique.mockResolvedValue(null);
      prisma.friendRequest.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 'old-req', status: 'CANCELLED' });

      const updated = {
        id: 'old-req',
        status: 'PENDING',
        createdAt: new Date(),
        receiver: mockUser2,
      };
      prisma.friendRequest.update.mockResolvedValue(updated);

      const result = await service.sendRequest('user-1', 'user-2');
      expect(result.id).toEqual('old-req');
      expect(prisma.friendRequest.update).toHaveBeenCalledWith({
        where: { id: 'old-req' },
        data: { status: 'PENDING' },
        include: expect.any(Object),
      });
    });
  });

  describe('cancelRequest', () => {
    it('should throw NotFoundException if request not found', async () => {
      prisma.friendRequest.findUnique.mockResolvedValue(null);

      await expect(service.cancelRequest('req-1', 'user-1')).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user is not the sender', async () => {
      prisma.friendRequest.findUnique.mockResolvedValue({
        id: 'req-1',
        senderId: 'user-2',
        receiverId: 'user-1',
        status: 'PENDING',
      });

      await expect(service.cancelRequest('req-1', 'user-1')).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException if request is not pending', async () => {
      prisma.friendRequest.findUnique.mockResolvedValue({
        id: 'req-1',
        senderId: 'user-1',
        receiverId: 'user-2',
        status: 'ACCEPTED',
      });

      await expect(service.cancelRequest('req-1', 'user-1')).rejects.toThrow(BadRequestException);
    });

    it('should cancel pending request successfully', async () => {
      prisma.friendRequest.findUnique.mockResolvedValue({
        id: 'req-1',
        senderId: 'user-1',
        receiverId: 'user-2',
        status: 'PENDING',
      });
      prisma.friendRequest.update.mockResolvedValue({
        id: 'req-1',
        status: 'CANCELLED',
      });

      const result = await service.cancelRequest('req-1', 'user-1');
      expect(result.success).toBe(true);
      expect(prisma.friendRequest.update).toHaveBeenCalledWith({
        where: { id: 'req-1' },
        data: { status: 'CANCELLED' },
      });
    });
  });

  describe('acceptRequest', () => {
    it('should throw NotFoundException if request not found', async () => {
      prisma.friendRequest.findUnique.mockResolvedValue(null);

      await expect(service.acceptRequest('req-1', 'user-2')).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user is not the receiver', async () => {
      prisma.friendRequest.findUnique.mockResolvedValue({
        id: 'req-1',
        senderId: 'user-1',
        receiverId: 'user-2',
        status: 'PENDING',
      });

      await expect(service.acceptRequest('req-1', 'user-1')).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException if request is not pending', async () => {
      prisma.friendRequest.findUnique.mockResolvedValue({
        id: 'req-1',
        senderId: 'user-1',
        receiverId: 'user-2',
        status: 'REJECTED',
      });

      await expect(service.acceptRequest('req-1', 'user-2')).rejects.toThrow(BadRequestException);
    });

    it('should accept request and create bidirectional friendships in transaction', async () => {
      prisma.friendRequest.findUnique.mockResolvedValue({
        id: 'req-1',
        senderId: 'user-1',
        receiverId: 'user-2',
        status: 'PENDING',
      });
      prisma.friendRequest.update.mockResolvedValue({});
      prisma.friendship.upsert.mockResolvedValue({});
      prisma.friendRequest.updateMany.mockResolvedValue({});

      const result = await service.acceptRequest('req-1', 'user-2');
      expect(result.success).toBe(true);
      expect(prisma.$transaction).toHaveBeenCalled();
      expect(prisma.friendship.upsert).toHaveBeenCalledTimes(2);
    });
  });

  describe('rejectRequest', () => {
    it('should throw NotFoundException if request not found', async () => {
      prisma.friendRequest.findUnique.mockResolvedValue(null);

      await expect(service.rejectRequest('req-1', 'user-2')).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user is not the receiver', async () => {
      prisma.friendRequest.findUnique.mockResolvedValue({
        id: 'req-1',
        senderId: 'user-1',
        receiverId: 'user-2',
        status: 'PENDING',
      });

      await expect(service.rejectRequest('req-1', 'user-1')).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException if request is not pending', async () => {
      prisma.friendRequest.findUnique.mockResolvedValue({
        id: 'req-1',
        senderId: 'user-1',
        receiverId: 'user-2',
        status: 'CANCELLED',
      });

      await expect(service.rejectRequest('req-1', 'user-2')).rejects.toThrow(BadRequestException);
    });

    it('should reject request successfully', async () => {
      prisma.friendRequest.findUnique.mockResolvedValue({
        id: 'req-1',
        senderId: 'user-1',
        receiverId: 'user-2',
        status: 'PENDING',
      });
      prisma.friendRequest.update.mockResolvedValue({
        id: 'req-1',
        status: 'REJECTED',
      });

      const result = await service.rejectRequest('req-1', 'user-2');
      expect(result.success).toBe(true);
      expect(prisma.friendRequest.update).toHaveBeenCalledWith({
        where: { id: 'req-1' },
        data: { status: 'REJECTED' },
      });
    });
  });

  describe('getReceivedRequests', () => {
    it('should return paginated received requests with nextCursor', async () => {
      const mockItems = [
        {
          id: 'req-1',
          status: 'PENDING',
          createdAt: new Date(),
          sender: mockUser1,
        },
        {
          id: 'req-2',
          status: 'PENDING',
          createdAt: new Date(),
          sender: mockUser2,
        },
      ];
      prisma.friendRequest.findMany.mockResolvedValue(mockItems);

      const result = await service.getReceivedRequests('user-3', { limit: 1 });
      expect(result.items.length).toBe(1);
      expect(result.nextCursor).toBe('req-1');
    });
  });

  describe('getSentRequests', () => {
    it('should return paginated sent requests with nextCursor', async () => {
      const mockItems = [
        {
          id: 'req-1',
          status: 'PENDING',
          createdAt: new Date(),
          receiver: mockUser2,
        },
      ];
      prisma.friendRequest.findMany.mockResolvedValue(mockItems);

      const result = await service.getSentRequests('user-1', { limit: 20 });
      expect(result.items.length).toBe(1);
      expect(result.nextCursor).toBeNull();
    });
  });

  describe('getFriends', () => {
    it('should return paginated friends list with nextCursor', async () => {
      const mockFriendships = [
        {
          id: 'f-1',
          friendId: 'user-2',
          createdAt: new Date(),
          friend: mockUser2,
        },
        {
          id: 'f-2',
          friendId: 'user-3',
          createdAt: new Date(),
          friend: { id: 'user-3', name: 'User Three', username: 'user3' },
        },
      ];
      prisma.friendship.findMany.mockResolvedValue(mockFriendships);

      const result = await service.getFriends('user-1', { limit: 1 });
      expect(result.items.length).toBe(1);
      expect(result.nextCursor).toBe('f-1');
    });

    it('should filter friends by search keyword', async () => {
      prisma.friendship.findMany.mockResolvedValue([]);

      await service.getFriends('user-1', { search: 'Two', limit: 20 });
      expect(prisma.friendship.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            userId: 'user-1',
            friend: {
              OR: [
                { name: { contains: 'Two', mode: 'insensitive' } },
                { username: { contains: 'Two', mode: 'insensitive' } },
              ],
            },
          },
        }),
      );
    });
  });

  describe('unfriend', () => {
    it('should throw BadRequestException when unfriending oneself', async () => {
      await expect(service.unfriend('user-1', 'user-1')).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if target user does not exist', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.unfriend('user-1', 'user-2')).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if friendship does not exist', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser2);
      prisma.friendship.findUnique.mockResolvedValue(null);

      await expect(service.unfriend('user-1', 'user-2')).rejects.toThrow(
        'Friendship does not exist.',
      );
    });

    it('should remove bidirectional friendships in transaction', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser2);
      prisma.friendship.findUnique.mockResolvedValue({ id: 'f-1' });
      prisma.friendship.deleteMany.mockResolvedValue({ count: 2 });

      const result = await service.unfriend('user-1', 'user-2');
      expect(result.success).toBe(true);
      expect(prisma.$transaction).toHaveBeenCalled();
    });
  });

  describe('getRelationshipStatus', () => {
    it('should return NONE if viewer is undefined', async () => {
      const result = await service.getRelationshipStatus(undefined, 'user-2');
      expect(result).toEqual({ status: RelationshipStatus.NONE, requestId: null });
    });

    it('should return SELF if viewer is target user', async () => {
      const result = await service.getRelationshipStatus('user-1', 'user-1');
      expect(result).toEqual({ status: RelationshipStatus.SELF, requestId: null });
    });

    it('should return FRIENDS if friendship exists', async () => {
      prisma.friendship.findUnique.mockResolvedValue({ id: 'f-1' });

      const result = await service.getRelationshipStatus('user-1', 'user-2');
      expect(result).toEqual({ status: RelationshipStatus.FRIENDS, requestId: null });
    });

    it('should return PENDING_SENT if viewer sent pending request', async () => {
      prisma.friendship.findUnique.mockResolvedValue(null);
      prisma.friendRequest.findFirst.mockResolvedValueOnce({
        id: 'req-1',
        status: 'PENDING',
      });

      const result = await service.getRelationshipStatus('user-1', 'user-2');
      expect(result).toEqual({
        status: RelationshipStatus.PENDING_SENT,
        requestId: 'req-1',
      });
    });

    it('should return PENDING_RECEIVED if target sent pending request to viewer', async () => {
      prisma.friendship.findUnique.mockResolvedValue(null);
      prisma.friendRequest.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce({
        id: 'req-2',
        status: 'PENDING',
      });

      const result = await service.getRelationshipStatus('user-1', 'user-2');
      expect(result).toEqual({
        status: RelationshipStatus.PENDING_RECEIVED,
        requestId: 'req-2',
      });
    });

    it('should return NONE if no friendship or pending request exists', async () => {
      prisma.friendship.findUnique.mockResolvedValue(null);
      prisma.friendRequest.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce(null);

      const result = await service.getRelationshipStatus('user-1', 'user-2');
      expect(result).toEqual({ status: RelationshipStatus.NONE, requestId: null });
    });
  });
});
