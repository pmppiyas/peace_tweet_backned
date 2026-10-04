import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateShareDto, ShareContentType, ShareTarget } from './dto/create-share.dto';
import { NotificationType, PostStatus } from '@prisma/client';
import { PostType } from '../../common/enums/post-type.enum';
import { PostVisibility } from '../../common/enums/post-visibility.enum';
import { GroupMemberRole } from '../../common/enums/group-member-role.enum';
import { Role } from '../../common/enums/role.enum';
import { ActiveUserData } from '../../common/interfaces/active-user-data.interface';

@Injectable()
export class SharesService {
  constructor(private readonly prisma: PrismaService) {}

  private get db(): any {
    return this.prisma;
  }

  async createShare(userId: string, dto: CreateShareDto) {
    let targetAuthorId: string | null = null;
    let targetContent: any = null;
    let canonicalPath = '';

    // 1. Verify content existence based on contentType
    if (dto.contentType === ShareContentType.POST) {
      targetContent = await this.db.post.findUnique({
        where: { id: dto.contentId },
        include: {
          author: { select: { id: true, name: true, username: true } },
        },
      });
      if (!targetContent) {
        throw new NotFoundException(`Post with ID '${dto.contentId}' not found.`);
      }
      targetAuthorId = targetContent.authorId;
      canonicalPath = `/posts/${targetContent.id}`;
    } else if (dto.contentType === ShareContentType.DUA) {
      targetContent = await this.db.dua.findUnique({
        where: { id: dto.contentId },
      });
      if (!targetContent) {
        throw new NotFoundException(`Dua with ID '${dto.contentId}' not found.`);
      }
      targetAuthorId = targetContent.createdById;
      canonicalPath = `/duas/${targetContent.id}`;
    } else if (dto.contentType === ShareContentType.BLOOD_REQUEST) {
      targetContent = await this.db.bloodRequest.findUnique({
        where: { id: dto.contentId },
      });
      if (!targetContent) {
        throw new NotFoundException(`Blood request with ID '${dto.contentId}' not found.`);
      }
      targetAuthorId = targetContent.requesterId;
      canonicalPath = `/blood/${targetContent.id}`;
    } else {
      throw new BadRequestException(`Unsupported contentType '${dto.contentType}'`);
    }

    // 2. Handle LINK target (copy link: do NOT save to database)
    if (dto.target === ShareTarget.LINK) {
      return {
        success: true,
        target: ShareTarget.LINK,
        shareUrl: canonicalPath,
        message: 'Link copied successfully.',
      };
    }

    // 3. Determine Group or Feed destination
    let postVisibility = PostVisibility.PUBLIC;
    let postStatus: PostStatus = PostStatus.PUBLISHED;
    let group: any = null;

    if (dto.target === ShareTarget.GROUP) {
      if (!dto.groupId) {
        throw new BadRequestException('groupId is required when target is GROUP.');
      }

      group = await this.db.group.findUnique({
        where: { id: dto.groupId },
      });
      if (!group) {
        throw new NotFoundException(`Group with ID '${dto.groupId}' not found.`);
      }

      // Check group membership
      const membership = await this.db.groupMember.findUnique({
        where: {
          groupId_userId: {
            groupId: dto.groupId,
            userId,
          },
        },
      });

      if (!membership) {
        throw new ForbiddenException('You must be a member of this group to share posts to it.');
      }

      postVisibility = PostVisibility.GROUP;

      // Group post approval check
      if (group.requiresPostApproval && membership.role === GroupMemberRole.MEMBER) {
        postStatus = PostStatus.PENDING_APPROVAL;
      } else {
        postStatus = PostStatus.PUBLISHED;
      }
    }

    // 4. Determine Post type and content associations
    let newPostType = PostType.TEXT;
    let newOriginalPostId: string | null = null;
    let newDuaId: string | null = null;
    let newBloodRequestId: string | null = null;

    if (dto.contentType === ShareContentType.POST) {
      newPostType = targetContent.type || PostType.TEXT;
      newOriginalPostId = targetContent.id;
      newDuaId = targetContent.duaId || null;
      newBloodRequestId = targetContent.bloodRequestId || null;
    } else if (dto.contentType === ShareContentType.DUA) {
      newPostType = PostType.DUA;
      newDuaId = targetContent.id;
    } else if (dto.contentType === ShareContentType.BLOOD_REQUEST) {
      newPostType = PostType.BLOOD_REQUEST;
      newBloodRequestId = targetContent.id;
    }

    // 5. Transaction: Create the new Post and the Share record
    const result = await this.db.$transaction(async (tx: any) => {
      // Create new Post
      const createdPost = await tx.post.create({
        data: {
          authorId: userId,
          type: newPostType,
          content: dto.caption?.trim() || null,
          groupId: dto.groupId || null,
          visibility: postVisibility,
          status: postStatus,
          originalPostId: newOriginalPostId,
          duaId: newDuaId,
          bloodRequestId: newBloodRequestId,
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
              dua: true,
              bloodRequest: true,
            },
          },
          dua: true,
          bloodRequest: true,
          group: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
      });

      // Create Share record
      const shareRecord = await tx.share.create({
        data: {
          userId,
          contentType: dto.contentType,
          contentId: dto.contentId,
          target: dto.target,
          groupId: dto.groupId || null,
          caption: dto.caption?.trim() || null,
          sharedPostId: createdPost.id,
          postId: dto.contentType === ShareContentType.POST ? dto.contentId : null,
          duaId: dto.contentType === ShareContentType.DUA ? dto.contentId : null,
          bloodRequestId: dto.contentType === ShareContentType.BLOOD_REQUEST ? dto.contentId : null,
        },
      });

      // Notification to original author if different user
      if (targetAuthorId && targetAuthorId !== userId) {
        try {
          await tx.notification.create({
            data: {
              recipientId: targetAuthorId,
              actorId: userId,
              type: NotificationType.POST_SHARE,
              entityId: createdPost.id,
              entityType: 'post',
              title: 'Post shared',
              message: 'Someone shared your content.',
            },
          });
        } catch (e: any) {
          // Non-blocking notification error
        }
      }

      return {
        post: createdPost,
        shareRecord,
      };
    });

    const isPending = postStatus === PostStatus.PENDING_APPROVAL;

    const formattedPost = result.post
      ? {
          id: result.post.id,
          groupId: result.post.groupId || null,
          type: result.post.type,
          content: result.post.content,
          mediaUrls: result.post.mediaUrls || [],
          mediaLayout: result.post.mediaLayout || 'COLLAGE',
          feeling: result.post.feeling || null,
          originalPostId: result.post.originalPostId || null,
          originalPost: result.post.originalPost || null,
          bloodRequestId: result.post.bloodRequestId || null,
          bloodRequest: result.post.bloodRequest || null,
          createdAt: result.post.createdAt,
          visibility: result.post.visibility,
          status: result.post.status,
          author: {
            id: result.post.author?.id,
            name: result.post.author?.name,
            username: result.post.author?.username,
            avatar: result.post.author?.avatarUrl || null,
          },
          dua: result.post.dua || null,
          stats: {
            reactionCount: 0,
            commentCount: 0,
            saveCount: 0,
            shareCount: 0,
          },
          viewer: {
            hasReacted: false,
            hasSaved: false,
          },
        }
      : null;

    return {
      success: true,
      pendingApproval: isPending,
      post: formattedPost,
      shareRecord: result.shareRecord,
      message: isPending
        ? 'Your post was shared to the group and is pending admin approval.'
        : 'Shared successfully.',
    };
  }

  // Get share count for any content
  async getShareCount(contentType: ShareContentType, contentId: string): Promise<number> {
    const count = await this.db.share.count({
      where: {
        contentType,
        contentId,
      },
    });
    return count;
  }

  // Get list of shares with filtering
  async getShares(query: {
    contentType?: ShareContentType;
    contentId?: string;
    userId?: string;
    limit?: number;
    cursor?: string;
  }) {
    const limit = Math.min(Math.max(query.limit || 20, 1), 50);
    const where: any = {};

    if (query.contentType) {
      where.contentType = query.contentType;
    }
    if (query.contentId) {
      where.contentId = query.contentId;
    }
    if (query.userId) {
      where.userId = query.userId;
    }

    const items = await this.db.share.findMany({
      where,
      take: limit + 1,
      cursor: query.cursor ? { id: query.cursor } : undefined,
      skip: query.cursor ? 1 : 0,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            username: true,
            avatarUrl: true,
          },
        },
        group: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    let nextCursor: string | null = null;
    let resultItems = items;
    if (items.length > limit) {
      resultItems = items.slice(0, limit);
      nextCursor = resultItems[resultItems.length - 1].id;
    }

    const totalCount = await this.db.share.count({ where });

    return {
      items: resultItems,
      nextCursor,
      totalCount,
    };
  }

  // Delete a share record and its associated created post
  async deleteShare(shareId: string, currentUser: ActiveUserData) {
    const share = await this.db.share.findUnique({
      where: { id: shareId },
    });

    if (!share) {
      throw new NotFoundException(`Share with ID '${shareId}' not found.`);
    }

    if (share.userId !== currentUser.id && currentUser.role !== Role.ADMIN) {
      throw new ForbiddenException('You are not authorized to delete this share.');
    }

    // If this share generated a post, delete that post too
    if (share.sharedPostId) {
      await this.db.post.deleteMany({
        where: { id: share.sharedPostId },
      });
    }

    // Delete the share row
    await this.db.share.delete({
      where: { id: shareId },
    });

    return {
      success: true,
      message: 'Share deleted successfully.',
    };
  }
}
