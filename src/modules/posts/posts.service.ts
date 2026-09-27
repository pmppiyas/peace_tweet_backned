import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { GroupVisibility } from '../../common/enums/group-visibility.enum';
import { PostStatus } from '../../common/enums/post-status.enum';
import { PostType } from '../../common/enums/post-type.enum';
import { PostVisibility } from '../../common/enums/post-visibility.enum';
import { Role } from '../../common/enums/role.enum';
import { ActiveUserData } from '../../common/interfaces/active-user-data.interface';
import { PrismaService } from '../../database/prisma.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { CreatePostDto } from './dto/create-post.dto';
import { QueryFeedDto } from './dto/query-feed.dto';
import { UpdatePostDto } from './dto/update-post.dto';

@Injectable()
export class PostsService {
  constructor(private readonly prisma: PrismaService) {}

  private get db(): any {
    return this.prisma;
  }

  async create(dto: CreatePostDto, authorId: string) {
    if (dto.type === PostType.DUA) {
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
      throw new BadRequestException(`Content is required for ${dto.type} posts.`);
    }

    const post = await this.db.post.create({
      data: {
        authorId,
        type: dto.type,
        content: dto.content?.trim(),
        duaId: dto.duaId || null,
        visibility: dto.visibility ?? PostVisibility.PUBLIC,
        status: dto.status ?? PostStatus.PUBLISHED,
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

    return this.formatPostResponse(post, authorId);
  }

  async getFeed(query: QueryFeedDto, currentUser?: ActiveUserData) {
    const limit = Math.min(Math.max(query.limit || 20, 1), 50);
    const cursor = query.cursor;

    // Global feed only returns normal feed posts (groupId == null)
    const where: any = {
      status: PostStatus.PUBLISHED,
      visibility: PostVisibility.PUBLIC,
      groupId: null,
    };

    if (query.type) {
      where.type = query.type;
    }

    const rawPosts = await this.db.post.findMany({
      where,
      take: limit + 1,
      cursor: cursor ? { id: cursor } : undefined,
      skip: cursor ? 1 : 0,
      orderBy: {
        createdAt: 'desc',
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
        reactions: currentUser?.id
          ? {
              where: { userId: currentUser.id },
              select: { id: true },
            }
          : false,
        savedPosts: currentUser?.id
          ? {
              where: { userId: currentUser.id },
              select: { id: true },
            }
          : false,
      },
    });

    let nextCursor: string | null = null;
    let items: any[] = rawPosts;

    if (rawPosts.length > limit) {
      items = rawPosts.slice(0, limit);
      nextCursor = items[items.length - 1].id;
    }

    const formattedItems = items.map((post: any) => this.formatPostResponse(post, currentUser?.id));

    return {
      items: formattedItems,
      nextCursor,
    };
  }

  async findOne(id: string, currentUser?: ActiveUserData) {
    const post = await this.db.post.findUnique({
      where: { id },
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
        reactions: currentUser?.id
          ? {
              where: { userId: currentUser.id },
              select: { id: true },
            }
          : false,
        savedPosts: currentUser?.id
          ? {
              where: { userId: currentUser.id },
              select: { id: true },
            }
          : false,
      },
    });

    if (!post) {
      throw new NotFoundException(`Post with ID '${id}' not found.`);
    }

    if (
      post.status !== PostStatus.PUBLISHED &&
      (!currentUser || (currentUser.id !== post.authorId && currentUser.role !== Role.ADMIN))
    ) {
      throw new NotFoundException(`Post with ID '${id}' not found.`);
    }

    // If post belongs to a group, verify group privacy access
    if (post.groupId) {
      await this.verifyGroupPostAccess(post.groupId, currentUser);
    }

    return this.formatPostResponse(post, currentUser?.id);
  }

  async update(id: string, dto: UpdatePostDto, currentUser: ActiveUserData) {
    const post = await this.db.post.findUnique({
      where: { id },
    });

    if (!post) {
      throw new NotFoundException(`Post with ID '${id}' not found.`);
    }

    if (post.authorId !== currentUser.id && currentUser.role !== Role.ADMIN) {
      throw new ForbiddenException('You are not authorized to edit this post.');
    }

    const updated = await this.db.post.update({
      where: { id },
      data: {
        content: dto.content !== undefined ? dto.content.trim() : undefined,
        visibility: dto.visibility,
        status: dto.status,
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

    return this.formatPostResponse(updated, currentUser.id);
  }

  async remove(id: string, currentUser: ActiveUserData) {
    const post = await this.db.post.findUnique({
      where: { id },
    });

    if (!post) {
      throw new NotFoundException(`Post with ID '${id}' not found.`);
    }

    if (post.authorId !== currentUser.id && currentUser.role !== Role.ADMIN) {
      throw new ForbiddenException('You are not authorized to delete this post.');
    }

    await this.db.post.delete({
      where: { id },
    });

    return {
      success: true,
      message: 'Post deleted successfully.',
    };
  }

  async savePost(postId: string, userId: string) {
    const post = await this.db.post.findUnique({
      where: { id: postId },
    });
    if (!post) {
      throw new NotFoundException(`Post with ID '${postId}' not found.`);
    }

    if (post.groupId) {
      await this.verifyGroupPostAccess(post.groupId, { id: userId, email: '', role: Role.USER });
    }

    await this.db.savedPost.upsert({
      where: {
        userId_postId: {
          userId,
          postId,
        },
      },
      create: {
        userId,
        postId,
      },
      update: {},
    });

    return {
      success: true,
      hasSaved: true,
      message: 'Post saved successfully.',
    };
  }

  async unsavePost(postId: string, userId: string) {
    await this.db.savedPost.deleteMany({
      where: {
        userId,
        postId,
      },
    });

    return {
      success: true,
      hasSaved: false,
      message: 'Post removed from saved items.',
    };
  }

  async react(postId: string, userId: string) {
    const post = await this.db.post.findUnique({
      where: { id: postId },
    });
    if (!post) {
      throw new NotFoundException(`Post with ID '${postId}' not found.`);
    }

    if (post.groupId) {
      await this.verifyGroupPostAccess(post.groupId, { id: userId, email: '', role: Role.USER });
    }

    await this.db.reaction.upsert({
      where: {
        userId_postId: {
          userId,
          postId,
        },
      },
      create: {
        userId,
        postId,
        type: 'LIKE',
      },
      update: {
        type: 'LIKE',
      },
    });

    const count = await this.db.reaction.count({
      where: { postId },
    });

    return {
      success: true,
      hasReacted: true,
      reactionCount: count,
    };
  }

  async unreact(postId: string, userId: string) {
    await this.db.reaction.deleteMany({
      where: {
        userId,
        postId,
      },
    });

    const count = await this.db.reaction.count({
      where: { postId },
    });

    return {
      success: true,
      hasReacted: false,
      reactionCount: count,
    };
  }

  async getComments(postId: string, limit = 50, currentUser?: ActiveUserData) {
    const post = await this.db.post.findUnique({
      where: { id: postId },
    });
    if (!post) {
      throw new NotFoundException(`Post with ID '${postId}' not found.`);
    }

    if (post.groupId) {
      await this.verifyGroupPostAccess(post.groupId, currentUser);
    }

    const comments = await this.db.comment.findMany({
      where: { postId },
      take: limit,
      orderBy: { createdAt: 'asc' },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            username: true,
          },
        },
      },
    });

    return comments.map((c: any) => ({
      id: c.id,
      postId: c.postId,
      content: c.content,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
      author: {
        id: c.author.id,
        name: c.author.name,
        username: c.author.username,
        avatar: null,
      },
    }));
  }

  async createComment(postId: string, userId: string, dto: CreateCommentDto) {
    const post = await this.db.post.findUnique({
      where: { id: postId },
    });
    if (!post) {
      throw new NotFoundException(`Post with ID '${postId}' not found.`);
    }

    if (post.groupId) {
      await this.verifyGroupPostAccess(post.groupId, { id: userId, email: '', role: Role.USER });
    }

    const comment = await this.db.comment.create({
      data: {
        postId,
        authorId: userId,
        content: dto.content.trim(),
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            username: true,
          },
        },
      },
    });

    const commentCount = await this.db.comment.count({
      where: { postId },
    });

    return {
      comment: {
        id: comment.id,
        postId: comment.postId,
        content: comment.content,
        createdAt: comment.createdAt,
        author: {
          id: comment.author.id,
          name: comment.author.name,
          username: comment.author.username,
          avatar: null,
        },
      },
      commentCount,
    };
  }

  private async verifyGroupPostAccess(
    groupId: string,
    currentUser?: { id?: string; role?: string; [key: string]: any },
  ) {
    const group = await this.db.group.findUnique({
      where: { id: groupId },
    });

    if (!group) return;

    if (group.visibility === GroupVisibility.PRIVATE) {
      if (!currentUser?.id) {
        throw new ForbiddenException(
          'You must be a member of this private group to access this post.',
        );
      }
      if (currentUser.role === Role.ADMIN) return;

      const member = await this.db.groupMember.findUnique({
        where: {
          groupId_userId: { groupId, userId: currentUser.id },
        },
      });

      if (!member) {
        throw new ForbiddenException(
          'You must be a member of this private group to access this post.',
        );
      }
    }
  }

  private formatPostResponse(post: any, currentUserId?: string) {
    return {
      id: post.id,
      groupId: post.groupId || null,
      type: post.type,
      content: post.content,
      createdAt: post.createdAt,
      visibility: post.visibility,
      status: post.status,
      author: {
        id: post.author?.id,
        name: post.author?.name,
        username: post.author?.username,
        avatar: null,
      },
      dua: post.dua
        ? {
            id: post.dua.id,
            title: post.dua.title,
            fadilah: post.dua.fadilah,
            duaBangla: post.dua.duaBangla,
            meaningBangla: post.dua.meaningBangla,
            arabicText: post.dua.arabicText,
            transliteration: post.dua.transliteration,
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
        : null,
      stats: {
        reactionCount: post._count?.reactions || 0,
        commentCount: post._count?.comments || 0,
      },
      viewer: {
        hasReacted: Array.isArray(post.reactions) ? post.reactions.length > 0 : false,
        hasSaved: Array.isArray(post.savedPosts) ? post.savedPosts.length > 0 : false,
      },
    };
  }
}
