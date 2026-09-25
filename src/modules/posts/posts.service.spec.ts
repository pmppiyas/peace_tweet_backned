import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PostStatus } from '../../common/enums/post-status.enum';
import { PostType } from '../../common/enums/post-type.enum';
import { PostVisibility } from '../../common/enums/post-visibility.enum';
import { Role } from '../../common/enums/role.enum';
import { ActiveUserData } from '../../common/interfaces/active-user-data.interface';
import { PrismaService } from '../../database/prisma.service';
import { PostsService } from './posts.service';

describe('PostsService', () => {
  let service: PostsService;
  let prisma: any;

  const mockUser: ActiveUserData = {
    id: 'user-1',
    email: 'user1@example.com',
    username: 'user1',
    role: Role.USER,
  };

  const mockAdmin: ActiveUserData = {
    id: 'admin-1',
    email: 'admin@example.com',
    username: 'admin',
    role: Role.ADMIN,
  };

  const mockDua = {
    id: 'dua-1',
    title: 'Dua for Guidance',
    fadilah: 'Great virtues',
    duaBangla: 'হে আল্লাহ আমাকে সঠিক পথ দেখাও',
    meaningBangla: 'হে আল্লাহ আমাকে হেদায়েত দান করুন',
    arabicText: 'اللهم اهدني',
    transliteration: 'Allahumma ihdini',
    references: [],
    audios: [],
    category: { id: 'cat-1', name: 'Daily', slug: 'daily' },
  };

  const mockPost = {
    id: 'post-1',
    authorId: 'user-1',
    type: PostType.TEXT,
    content: 'A beautiful morning reflection on patience (Sabr).',
    duaId: null,
    visibility: PostVisibility.PUBLIC,
    status: PostStatus.PUBLISHED,
    createdAt: new Date(),
    updatedAt: new Date(),
    author: { id: 'user-1', name: 'User One', username: 'user1' },
    dua: null,
    _count: { reactions: 5, comments: 2 },
    reactions: [],
    savedPosts: [],
  };

  beforeEach(async () => {
    prisma = {
      dua: {
        findUnique: jest.fn(),
      },
      post: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      savedPost: {
        upsert: jest.fn(),
        deleteMany: jest.fn(),
      },
      reaction: {
        upsert: jest.fn(),
        deleteMany: jest.fn(),
        count: jest.fn(),
      },
      comment: {
        create: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PostsService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    service = module.get<PostsService>(PostsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a TEXT post successfully', async () => {
      prisma.post.create.mockResolvedValue(mockPost);

      const result = await service.create(
        {
          type: PostType.TEXT,
          content: 'A beautiful morning reflection on patience (Sabr).',
        },
        mockUser.id,
      );

      expect(result.id).toEqual('post-1');
      expect(result.type).toEqual(PostType.TEXT);
      expect(result.content).toEqual('A beautiful morning reflection on patience (Sabr).');
      expect(prisma.post.create).toHaveBeenCalled();
    });

    it('should fail if TEXT post has no content', async () => {
      await expect(
        service.create(
          {
            type: PostType.TEXT,
            content: '',
          },
          mockUser.id,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should create a DUA post linked to a Dua', async () => {
      prisma.dua.findUnique.mockResolvedValue(mockDua);
      const duaPost = {
        ...mockPost,
        id: 'post-2',
        type: PostType.DUA,
        duaId: 'dua-1',
        dua: mockDua,
      };
      prisma.post.create.mockResolvedValue(duaPost);

      const result = await service.create(
        {
          type: PostType.DUA,
          duaId: 'dua-1',
        },
        mockUser.id,
      );

      expect(result.id).toEqual('post-2');
      expect(result.type).toEqual(PostType.DUA);
      expect(result.dua?.id).toEqual('dua-1');
    });

    it('should fail if DUA post has no duaId', async () => {
      await expect(
        service.create(
          {
            type: PostType.DUA,
          },
          mockUser.id,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should fail if linked Dua does not exist', async () => {
      prisma.dua.findUnique.mockResolvedValue(null);

      await expect(
        service.create(
          {
            type: PostType.DUA,
            duaId: 'non-existent-dua',
          },
          mockUser.id,
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getFeed', () => {
    it('should return public feed with cursor pagination', async () => {
      const postsList = [
        { ...mockPost, id: 'post-1' },
        { ...mockPost, id: 'post-2' },
      ];
      prisma.post.findMany.mockResolvedValue(postsList);

      const result = await service.getFeed({ limit: 2 }, mockUser);

      expect(result.items).toHaveLength(2);
      expect(result.nextCursor).toBeNull();
      expect(prisma.post.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            status: PostStatus.PUBLISHED,
            visibility: PostVisibility.PUBLIC,
          },
          take: 3,
        }),
      );
    });

    it('should compute nextCursor if more items exist than limit', async () => {
      const postsList = [
        { ...mockPost, id: 'post-1' },
        { ...mockPost, id: 'post-2' },
        { ...mockPost, id: 'post-3' },
      ];
      prisma.post.findMany.mockResolvedValue(postsList);

      const result = await service.getFeed({ limit: 2 });

      expect(result.items).toHaveLength(2);
      expect(result.nextCursor).toEqual('post-2');
    });
  });

  describe('savePost & unsavePost', () => {
    it('should save a post via upsert', async () => {
      prisma.post.findUnique.mockResolvedValue(mockPost);
      prisma.savedPost.upsert.mockResolvedValue({ id: 'saved-1' });

      const result = await service.savePost('post-1', mockUser.id);
      expect(result.hasSaved).toBe(true);
      expect(prisma.savedPost.upsert).toHaveBeenCalled();
    });

    it('should unsave a post', async () => {
      prisma.savedPost.deleteMany.mockResolvedValue({ count: 1 });

      const result = await service.unsavePost('post-1', mockUser.id);
      expect(result.hasSaved).toBe(false);
      expect(prisma.savedPost.deleteMany).toHaveBeenCalled();
    });
  });

  describe('react & unreact', () => {
    it('should react (LIKE) to a post via upsert and return count', async () => {
      prisma.post.findUnique.mockResolvedValue(mockPost);
      prisma.reaction.upsert.mockResolvedValue({ id: 'reaction-1' });
      prisma.reaction.count.mockResolvedValue(6);

      const result = await service.react('post-1', mockUser.id);
      expect(result.hasReacted).toBe(true);
      expect(result.reactionCount).toEqual(6);
    });

    it('should unreact from a post', async () => {
      prisma.reaction.deleteMany.mockResolvedValue({ count: 1 });
      prisma.reaction.count.mockResolvedValue(5);

      const result = await service.unreact('post-1', mockUser.id);
      expect(result.hasReacted).toBe(false);
      expect(result.reactionCount).toEqual(5);
    });
  });

  describe('comments', () => {
    it('should retrieve comments for a post', async () => {
      prisma.post.findUnique.mockResolvedValue(mockPost);
      prisma.comment.findMany.mockResolvedValue([
        {
          id: 'c-1',
          postId: 'post-1',
          content: 'Alhamdulillah',
          createdAt: new Date(),
          updatedAt: new Date(),
          author: { id: 'user-2', name: 'User Two', username: 'user2' },
        },
      ]);

      const result = await service.getComments('post-1');
      expect(result).toHaveLength(1);
      expect(result[0].content).toEqual('Alhamdulillah');
    });

    it('should create a comment on a post', async () => {
      prisma.post.findUnique.mockResolvedValue(mockPost);
      prisma.comment.create.mockResolvedValue({
        id: 'c-2',
        postId: 'post-1',
        content: 'SubhanAllah',
        createdAt: new Date(),
        author: { id: 'user-1', name: 'User One', username: 'user1' },
      });
      prisma.comment.count.mockResolvedValue(3);

      const result = await service.createComment('post-1', mockUser.id, {
        content: 'SubhanAllah',
      });

      expect(result.comment.content).toEqual('SubhanAllah');
      expect(result.commentCount).toEqual(3);
    });
  });

  describe('authorization', () => {
    it('should allow author to update their own post', async () => {
      prisma.post.findUnique.mockResolvedValue(mockPost);
      prisma.post.update.mockResolvedValue({
        ...mockPost,
        content: 'Updated content',
      });

      const result = await service.update(
        'post-1',
        { content: 'Updated content' },
        mockUser,
      );

      expect(result.content).toEqual('Updated content');
    });

    it('should throw ForbiddenException if user tries to update another user post', async () => {
      prisma.post.findUnique.mockResolvedValue(mockPost);

      const anotherUser: ActiveUserData = {
        id: 'user-99',
        email: 'other@example.com',
        username: 'other',
        role: Role.USER,
      };

      await expect(
        service.update('post-1', { content: 'Hack' }, anotherUser),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow admin to delete any post', async () => {
      prisma.post.findUnique.mockResolvedValue(mockPost);
      prisma.post.delete.mockResolvedValue(mockPost);

      const result = await service.remove('post-1', mockAdmin);
      expect(result.success).toBe(true);
    });
  });
});
