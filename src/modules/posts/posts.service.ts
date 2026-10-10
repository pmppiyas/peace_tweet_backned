import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { GroupVisibility } from '../../common/enums/group-visibility.enum';
import { PostStatus } from '../../common/enums/post-status.enum';
import { PostType } from '../../common/enums/post-type.enum';
import { PostVisibility } from '../../common/enums/post-visibility.enum';
import { Role } from '../../common/enums/role.enum';
import { ActiveUserData } from '../../common/interfaces/active-user-data.interface';
import { PrismaService } from '../../database/prisma.service';
import { autoCategorizeDua } from '../../app/modules/duas/utils/dua-categorizer';
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
    let finalDuaId: string | null = dto.duaId || null;
    let finalBloodRequestId: string | null = dto.bloodRequestId || null;

    if (dto.type === PostType.DUA) {
      if (!finalDuaId && dto.duaData) {
        const transliteration = (
          dto.duaData.transliteration ||
          (dto.duaData as any).duaBangla ||
          ''
        ).trim();
        const meaning = (
          dto.duaData.meaning ||
          dto.duaData.meaningBangla ||
          ''
        ).trim();
        const fadilah = dto.duaData.fadilah ? dto.duaData.fadilah.trim() : null;
        const arabicText = dto.duaData.arabicText ? dto.duaData.arabicText.trim() : null;

        const detectedSlug = autoCategorizeDua({
          meaning,
          transliteration,
          fadilah,
        });

        let category = await this.prisma.category.findUnique({
          where: { slug: detectedSlug },
        });
        if (!category) {
          category = await this.prisma.category.findUnique({
            where: { slug: 'others' },
          });
        }
        if (!category) {
          category = await this.prisma.category.findFirst();
        }

        const createdDua = await this.prisma.dua.create({
          data: {
            transliteration: transliteration || null,
            meaning,
            fadilah,
            arabicText,
            categoryId: category!.id,
            createdById: authorId,
            status: 'PUBLISHED',
          },
        });
        finalDuaId = createdDua.id;
      } else if (finalDuaId) {
        const duaExists = await this.prisma.dua.findUnique({
          where: { id: finalDuaId },
        });
        if (!duaExists) {
          throw new NotFoundException(`Dua with ID '${finalDuaId}' does not exist.`);
        }
      } else {
        throw new BadRequestException('Either duaId or duaData is required when post type is DUA.');
      }
    } else if (dto.type === PostType.BLOOD_REQUEST) {
      if (!finalBloodRequestId && dto.bloodRequestData) {
        const bData = dto.bloodRequestData;
        const createdBloodRequest = await this.prisma.bloodRequest.create({
          data: {
            requesterId: authorId,
            patientName: bData.patientName.trim(),
            patientAge: bData.patientAge ? Number(bData.patientAge) : null,
            problem: bData.problem?.trim() || null,
            bloodGroup: bData.bloodGroup,
            units: bData.units ? Number(bData.units) : 1,
            hospitalName: bData.hospitalName.trim(),
            hospitalAddress: bData.hospitalAddress?.trim() || null,
            location: bData.location.trim(),
            contactNumber: bData.contactNumber.trim(),
            alternateContact: bData.alternateContact?.trim() || null,
            neededDate: new Date(bData.neededDate),
            urgency: bData.urgency || 'REGULAR',
            note: bData.note?.trim() || null,
            forMyself: Boolean(bData.forMyself),
          },
        });
        finalBloodRequestId = createdBloodRequest.id;
      } else if (finalBloodRequestId) {
        const reqExists = await this.prisma.bloodRequest.findUnique({
          where: { id: finalBloodRequestId },
        });
        if (!reqExists) {
          throw new NotFoundException(`Blood Request with ID '${finalBloodRequestId}' does not exist.`);
        }
      } else {
        throw new BadRequestException(
          'Either bloodRequestId or bloodRequestData is required for blood request posts.',
        );
      }
    }
    
    const normalizedMediaUrls: string[] = Array.isArray(dto.mediaUrls)
      ? dto.mediaUrls.filter((u: any) => typeof u === 'string' && u.trim().length > 0)
      : typeof dto.mediaUrls === 'string' && (dto.mediaUrls as string).trim()
      ? [(dto.mediaUrls as string).trim()]
      : [];

    if (
      dto.type !== PostType.DUA &&
      dto.type !== PostType.BLOOD_REQUEST &&
      !dto.content?.trim() &&
      normalizedMediaUrls.length === 0
    ) {
      throw new BadRequestException(`Content or photo is required for ${dto.type} posts.`);
    }

    const post = await this.db.post.create({
      data: {
        authorId,
        type: dto.type,
        content: dto.content?.trim() || null,
        mediaUrls: normalizedMediaUrls,
        mediaLayout: dto.mediaLayout === 'SWIPE' ? 'SWIPE' : 'COLLAGE',
        feeling: dto.feeling?.trim() || null,
        duaId: finalDuaId,
        bloodRequestId: finalBloodRequestId,
        visibility: dto.visibility ?? PostVisibility.PUBLIC,
        status: dto.status ?? PostStatus.PUBLISHED,
      },
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
            shares: true,
            reposts: true,
          },
        },
      },
    });

    return this.formatPostResponse(post, authorId);
  }

  async getFeed(query: QueryFeedDto, currentUser?: ActiveUserData) {
    const limit = Math.min(Math.max(query.limit || 20, 1), 50);
    const cursor = query.cursor;

    const where: any = {
      status: PostStatus.PUBLISHED,
      visibility: PostVisibility.PUBLIC,
      groupId: null,
    };

    if (query.type) {
      where.type = query.type;
    }

    if ((query as any).authorId) {
      where.authorId = (query as any).authorId;
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
            shares: true,
            reposts: true,
          },
        },
        reactions: currentUser?.id
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

    const postIds = items.map((p: any) => p.id);
    const savedMap = new Map<string, string | null>();
    const saveCountMap = new Map<string, number>();

    if (postIds.length > 0) {
      const [savedItems, countGroups] = await Promise.all([
        currentUser?.id
          ? this.db.savedItem.findMany({
              where: {
                userId: currentUser.id,
                type: 'POST',
                contentId: { in: postIds },
              },
              select: { contentId: true, timeSlot: true },
            })
          : Promise.resolve([]),
        this.db.savedItem.groupBy({
          by: ['contentId'],
          where: {
            type: 'POST',
            contentId: { in: postIds },
          },
          _count: {
            contentId: true,
          },
        }),
      ]);

      savedItems.forEach((s: any) => savedMap.set(s.contentId, s.timeSlot));
      countGroups.forEach((c: any) =>
        saveCountMap.set(c.contentId, c._count.contentId),
      );
    }

    const formattedItems = items.map((post: any) =>
      this.formatPostResponse(post, currentUser?.id, {
        hasSaved: savedMap.has(post.id),
        timeSlot: savedMap.get(post.id) || null,
        saveCount: saveCountMap.get(post.id) || 0,
      }),
    );

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
            shares: true,
            reposts: true,
          },
        },
        reactions: currentUser?.id
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
      post.status === PostStatus.HIDDEN ||
      (post.status !== PostStatus.PUBLISHED &&
        (!currentUser || (currentUser.id !== post.authorId && currentUser.role !== Role.ADMIN)))
    ) {
      throw new NotFoundException(`Post with ID '${id}' not found.`);
    }

    if (post.groupId) {
      await this.verifyGroupPostAccess(post.groupId, currentUser);
    }

    let hasSaved = false;
    let timeSlot: string | null = null;

    const [savedRecord, saveCount] = await Promise.all([
      currentUser?.id
        ? this.db.savedItem.findUnique({
            where: {
              userId_type_contentId: {
                userId: currentUser.id,
                type: 'POST',
                contentId: id,
              },
            },
            select: { timeSlot: true },
          })
        : Promise.resolve(null),
      this.db.savedItem.count({
        where: {
          type: 'POST',
          contentId: id,
        },
      }),
    ]);

    if (savedRecord) {
      hasSaved = true;
      timeSlot = savedRecord.timeSlot;
    }

    return this.formatPostResponse(post, currentUser?.id, {
      hasSaved,
      timeSlot,
      saveCount,
    });
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
        mediaUrls: dto.mediaUrls !== undefined ? dto.mediaUrls : undefined,
        mediaLayout: dto.mediaLayout !== undefined ? dto.mediaLayout : undefined,
        feeling: dto.feeling !== undefined ? dto.feeling?.trim() || null : undefined,
        visibility: dto.visibility,
        status: dto.status,
      },
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
            shares: true,
            reposts: true,
          },
        },
      },
    });

    return this.formatPostResponse(updated, currentUser.id);
  }

  async remove(id: string, currentUser: ActiveUserData) {
    const post = await this.db.post.findUnique({
      where: { id },
      include: {
        reposts: {
          select: { id: true },
        },
      },
    });

    if (!post) {
      throw new NotFoundException(`Post with ID '${id}' not found.`);
    }

    if (post.authorId !== currentUser.id && currentUser.role !== Role.ADMIN) {
      throw new ForbiddenException('You are not authorized to delete this post.');
    }

    // If this post was created as a share, clean up the share entry
    await this.db.share.deleteMany({
      where: { sharedPostId: id },
    });

    // If this post has reposts (shared by others), soft-delete / hide it so that
    // reposts can still retain their reference and display "Post Unavailable"
    if (post.reposts && post.reposts.length > 0) {
      await this.db.post.update({
        where: { id },
        data: {
          status: PostStatus.HIDDEN,
          content: null,
          mediaUrls: [],
          feeling: null,
        },
      });

      // Also clean up shares table rows pointing to this post as the shared target
      await this.db.share.deleteMany({
        where: { postId: id },
      });

      return {
        success: true,
        message: 'Post deleted successfully.',
      };
    }

    // If no reposts exist, delete associated share rows and hard delete the post
    await this.db.share.deleteMany({
      where: {
        OR: [
          { sharedPostId: id },
          { postId: id },
        ],
      },
    });

    await this.db.savedItem.deleteMany({
      where: {
        type: 'POST',
        contentId: id,
      },
    });

    await this.db.post.delete({
      where: { id },
    });

    return {
      success: true,
      message: 'Post deleted successfully.',
    };
  }

  async savePost(postId: string, userId: string, timeSlot?: string) {
    const post = await this.db.post.findUnique({
      where: { id: postId },
    });
    if (!post) {
      throw new NotFoundException(`Post with ID '${postId}' not found.`);
    }

    if (post.groupId) {
      await this.verifyGroupPostAccess(post.groupId, { id: userId, email: '', role: Role.USER });
    }

    const savedRecord = await this.db.savedItem.upsert({
      where: {
        userId_type_contentId: {
          userId,
          type: 'POST',
          contentId: postId,
        },
      },
      create: {
        userId,
        type: 'POST',
        contentId: postId,
        timeSlot: timeSlot || null,
      },
      update: {
        ...(timeSlot !== undefined ? { timeSlot: timeSlot || null } : {}),
      },
    });

    return {
      success: true,
      hasSaved: true,
      timeSlot: savedRecord.timeSlot,
      message: 'Post saved successfully.',
    };
  }

  async updatePostTimeSlot(postId: string, userId: string, timeSlot: string | null) {
    const updated = await this.db.savedItem.upsert({
      where: {
        userId_type_contentId: {
          userId,
          type: 'POST',
          contentId: postId,
        },
      },
      create: {
        userId,
        type: 'POST',
        contentId: postId,
        timeSlot: timeSlot || null,
      },
      update: {
        timeSlot: timeSlot || null,
      },
    });
    return {
      success: true,
      timeSlot: updated.timeSlot,
      message: 'Time slot updated successfully.',
    };
  }

  async getSavedPosts(
    userId: string,
    query: { page?: number; limit?: number; timeSlot?: string; search?: string },
  ) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(query.limit) || 10));
    const skip = (page - 1) * limit;

    const where: Prisma.SavedItemWhereInput = {
      userId,
      type: 'POST',
    };

    if (query.timeSlot && query.timeSlot !== 'all') {
      where.timeSlot = query.timeSlot;
    }

    const [total, savedRecords] = await Promise.all([
      this.db.savedItem.count({ where }),
      this.db.savedItem.findMany({
        where,
        skip,
        take: limit,
        orderBy: { savedAt: 'desc' },
      }),
    ]);

    const postIds = savedRecords.map((r: any) => r.contentId);
    const posts = await this.db.post.findMany({
      where: {
        id: { in: postIds },
        ...(query.search && query.search.trim()
          ? { content: { contains: query.search.trim(), mode: 'insensitive' } }
          : {}),
      },
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
        media: true,
        _count: {
          select: {
            reactions: true,
            comments: true,
            shares: true,
            reposts: true,
          },
        },
        reactions: {
          where: { userId },
          select: { type: true },
        },
      },
    });

    const postMap = new Map((posts as any[]).map((p: any) => [p.id, p]));
    const formattedPosts: any[] = [];

    for (const record of savedRecords as any[]) {
      const post = postMap.get(record.contentId);
      if (post) {
        const formatted = this.formatPostResponse(
          post,
          { id: userId, email: '', role: Role.USER } as any,
          { hasSaved: true, timeSlot: record.timeSlot },
        );
        formatted.savedId = record.id;
        formatted.savedAt = record.savedAt;
        formattedPosts.push(formatted);
      }
    }

    return {
      data: formattedPosts,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async unsavePost(postId: string, userId: string) {
    await this.db.savedItem.deleteMany({
      where: {
        userId,
        contentId: postId,
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

    if (post.authorId && post.authorId !== userId) {
      await this.db.notification.create({
        data: {
          recipientId: post.authorId,
          actorId: userId,
          type: 'POST_LIKE' as any,
          message: 'liked your post.',
          entityId: postId,
          entityType: 'POST',
        },
      }).catch((e: any) => console.error('Notification error on like:', e));
    }

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
            avatarUrl: true,
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
        avatar: c.author.avatarUrl || null,
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
            avatarUrl: true,
          },
        },
      },
    });

    if (post.authorId && post.authorId !== userId) {
      await this.db.notification.create({
        data: {
          recipientId: post.authorId,
          actorId: userId,
          type: 'POST_COMMENT' as any,
          message: `commented: "${dto.content.trim().slice(0, 50)}${dto.content.trim().length > 50 ? '...' : ''}"`,
          entityId: postId,
          entityType: 'POST',
        },
      }).catch((e: any) => console.error('Notification error on comment:', e));
    }

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
          avatar: comment.author.avatarUrl || null,
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

  public formatPostResponse(
    post: any,
    currentUserId?: string,
    options?: { hasSaved?: boolean; timeSlot?: string | null; saveCount?: number },
  ): any {
    return {
      id: post.id,
      groupId: post.groupId || null,
      type: post.type,
      content: post.content,
      mediaUrls: post.mediaUrls || [],
      mediaLayout: post.mediaLayout || 'COLLAGE',
      feeling: post.feeling || null,
      originalPostId: post.originalPostId || null,
      originalPost: post.originalPost
        ? post.originalPost.status !== PostStatus.PUBLISHED
          ? {
              id: post.originalPost.id,
              isUnavailable: true,
              status: post.originalPost.status,
            }
          : this.formatPostResponse(post.originalPost, currentUserId)
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
      createdAt: post.createdAt,
      visibility: post.visibility,
      status: post.status,
      author: {
        id: post.author?.id,
        name: post.author?.name,
        username: post.author?.username,
        avatar: post.author?.avatarUrl || null,
      },
      dua: post.dua
        ? {
            id: post.dua.id,
            fadilah: post.dua.fadilah,
            transliteration: post.dua.transliteration,
            meaning: post.dua.meaning,
            meaningBangla: post.dua.meaning,
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
        saveCount: options?.saveCount !== undefined ? options.saveCount : 0,
        shareCount: (post._count?.shares || 0) + (post._count?.reposts || 0),
      },
      viewer: {
        hasReacted: Array.isArray(post.reactions) ? post.reactions.length > 0 : false,
        hasSaved: options?.hasSaved !== undefined ? options.hasSaved : false,
        timeSlot: options?.timeSlot !== undefined ? options.timeSlot : null,
      },
    };
  }
}
