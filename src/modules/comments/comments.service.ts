import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { GroupVisibility } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { Role } from '../../common/enums/role.enum';
import { ActiveUserData } from '../../common/interfaces/active-user-data.interface';
import {
  emitNotificationToUser,
  emitUnreadNotificationCount,
} from '../../socket';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';

@Injectable()
export class CommentsService {
  constructor(private readonly prisma: PrismaService) {}

  private get db(): any {
    return this.prisma;
  }

  private formatAuthor(author: any) {
    if (!author) {
      return {
        id: '',
        name: 'User',
        username: 'user',
        avatar: null,
      };
    }
    return {
      id: author.id,
      name: author.name,
      username: author.username,
      avatar: author.avatarUrl || author.avatar || null,
    };
  }

  private buildCommentTree(comments: any[]) {
    const nodeMap = new Map<string, any>();
    const rootComments: any[] = [];

    for (const c of comments) {
      nodeMap.set(c.id, {
        id: c.id,
        postId: c.postId,
        parentId: c.parentId || null,
        content: c.content,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
        author: this.formatAuthor(c.author),
        replyCount: 0,
        replies: [],
      });
    }

    for (const node of nodeMap.values()) {
      if (node.parentId && nodeMap.has(node.parentId)) {
        const parentNode = nodeMap.get(node.parentId);
        parentNode.replies.push(node);
        parentNode.replyCount = parentNode.replies.length;
      } else {
        rootComments.push(node);
      }
    }

    return { rootComments, nodeMap };
  }

  async getCommentsByPost(
    postId: string,
    limit = 50,
    currentUser?: ActiveUserData,
  ) {
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
      take: Math.max(limit * 4, 200),
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

    const { rootComments } = this.buildCommentTree(comments);
    return rootComments.slice(0, limit);
  }

  async findOne(commentId: string, currentUser?: ActiveUserData) {
    const comment = await this.db.comment.findUnique({
      where: { id: commentId },
      include: {
        post: true,
      },
    });

    if (!comment) {
      throw new NotFoundException(`Comment with ID '${commentId}' not found.`);
    }

    if (comment.post?.groupId) {
      await this.verifyGroupPostAccess(comment.post.groupId, currentUser);
    }

    const allPostComments = await this.db.comment.findMany({
      where: { postId: comment.postId },
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

    const { nodeMap } = this.buildCommentTree(allPostComments);
    return nodeMap.get(commentId);
  }

  async createComment(
    postIdOrUndefined: string | undefined,
    userId: string,
    dto: CreateCommentDto,
  ) {
    let resolvedPostId = postIdOrUndefined || dto.postId;
    let parentComment: any = null;

    if (dto.parentId) {
      parentComment = await this.db.comment.findUnique({
        where: { id: dto.parentId },
      });
      if (!parentComment) {
        throw new NotFoundException(
          `Parent comment with ID '${dto.parentId}' not found.`,
        );
      }
      if (!resolvedPostId) {
        resolvedPostId = parentComment.postId;
      } else if (parentComment.postId !== resolvedPostId) {
        throw new BadRequestException(
          'Parent comment does not belong to the specified post.',
        );
      }
    }

    if (!resolvedPostId) {
      throw new BadRequestException('postId is required to create a comment.');
    }

    const post = await this.db.post.findUnique({
      where: { id: resolvedPostId },
    });
    if (!post) {
      throw new NotFoundException(
        `Post with ID '${resolvedPostId}' not found.`,
      );
    }

    if (post.groupId) {
      await this.verifyGroupPostAccess(post.groupId, {
        id: userId,
        email: '',
        role: Role.USER,
      });
    }

    const trimmedContent = dto.content.trim();
    if (!trimmedContent) {
      throw new BadRequestException('Comment content cannot be empty.');
    }

    const comment = await this.db.comment.create({
      data: {
        postId: resolvedPostId,
        authorId: userId,
        parentId: dto.parentId || null,
        content: trimmedContent,
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

    const previewText = `${trimmedContent.slice(0, 50)}${trimmedContent.length > 50 ? '...' : ''}`;

    // Notify parent comment author when someone replies to their comment
    if (
      parentComment &&
      parentComment.authorId &&
      parentComment.authorId !== userId
    ) {
      this.db.notification
        .create({
          data: {
            recipientId: parentComment.authorId,
            actorId: userId,
            type: 'POST_COMMENT' as any,
            message: `replied to your comment: "${previewText}"`,
            entityId: resolvedPostId,
            entityType: 'POST',
          },
          include: {
            actor: {
              select: {
                id: true,
                name: true,
                username: true,
                avatarUrl: true,
              },
            },
          },
        })
        .then(async (notif: any) => {
          if (notif) {
            emitNotificationToUser(parentComment.authorId, notif);
            const unread = await this.db.notification.count({
              where: { recipientId: parentComment.authorId, isRead: false },
            });
            emitUnreadNotificationCount(parentComment.authorId, unread);
          }
        })
        .catch((e: any) =>
          console.error('Notification error on comment reply:', e),
        );
    }

    // Notify post author if they are not the commenter and weren't already notified as parentComment author
    if (
      post.authorId &&
      post.authorId !== userId &&
      post.authorId !== parentComment?.authorId
    ) {
      this.db.notification
        .create({
          data: {
            recipientId: post.authorId,
            actorId: userId,
            type: 'POST_COMMENT' as any,
            message: `commented: "${previewText}"`,
            entityId: resolvedPostId,
            entityType: 'POST',
          },
          include: {
            actor: {
              select: {
                id: true,
                name: true,
                username: true,
                avatarUrl: true,
              },
            },
          },
        })
        .then(async (notif: any) => {
          if (notif) {
            emitNotificationToUser(post.authorId, notif);
            const unread = await this.db.notification.count({
              where: { recipientId: post.authorId, isRead: false },
            });
            emitUnreadNotificationCount(post.authorId, unread);
          }
        })
        .catch((e: any) => console.error('Notification error on comment:', e));
    }

    const commentCount = await this.db.comment.count({
      where: { postId: resolvedPostId },
    });

    return {
      comment: {
        id: comment.id,
        postId: comment.postId,
        parentId: (comment as any).parentId || null,
        content: comment.content,
        createdAt: comment.createdAt,
        updatedAt: comment.updatedAt,
        author: this.formatAuthor(comment.author),
        replyCount: 0,
        replies: [],
      },
      commentCount,
    };
  }

  async updateComment(
    commentId: string,
    userId: string,
    dto: UpdateCommentDto,
    userRole?: string,
  ) {
    const existing = await this.db.comment.findUnique({
      where: { id: commentId },
    });

    if (!existing) {
      throw new NotFoundException(`Comment with ID '${commentId}' not found.`);
    }

    if (existing.authorId !== userId && userRole !== Role.ADMIN) {
      throw new ForbiddenException(
        'You are not authorized to edit this comment.',
      );
    }

    const trimmedContent = dto.content.trim();
    if (!trimmedContent) {
      throw new BadRequestException('Comment content cannot be empty.');
    }

    const updated = await this.db.comment.update({
      where: { id: commentId },
      data: {
        content: trimmedContent,
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

    return {
      comment: {
        id: updated.id,
        postId: updated.postId,
        parentId: (updated as any).parentId || null,
        content: updated.content,
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt,
        author: this.formatAuthor(updated.author),
      },
      postId: updated.postId,
      message: 'Comment updated successfully.',
    };
  }

  async deleteComment(
    commentId: string,
    currentUser: { id: string; role?: string },
  ) {
    const existing = await this.db.comment.findUnique({
      where: { id: commentId },
      include: {
        post: {
          select: {
            id: true,
            authorId: true,
          },
        },
      },
    });

    if (!existing) {
      throw new NotFoundException(`Comment with ID '${commentId}' not found.`);
    }

    const isCommentAuthor = existing.authorId === currentUser.id;
    const isPostAuthor = existing.post?.authorId === currentUser.id;
    const isAdmin = currentUser.role === Role.ADMIN;

    if (!isCommentAuthor && !isPostAuthor && !isAdmin) {
      throw new ForbiddenException(
        'You are not authorized to delete this comment.',
      );
    }

    const postId = existing.postId;

    // Collect all descendant reply IDs in case nested levels exist
    const allPostComments = await this.db.comment.findMany({
      where: { postId },
      select: { id: true, parentId: true },
    });

    const idsToDelete = new Set<string>([commentId]);
    let added = true;
    while (added) {
      added = false;
      for (const item of allPostComments) {
        if (
          item.parentId &&
          idsToDelete.has(item.parentId) &&
          !idsToDelete.has(item.id)
        ) {
          idsToDelete.add(item.id);
          added = true;
        }
      }
    }

    await this.db.comment.deleteMany({
      where: {
        id: { in: Array.from(idsToDelete) },
      },
    });

    const commentCount = await this.db.comment.count({
      where: { postId },
    });

    return {
      success: true,
      deletedId: commentId,
      deletedIds: Array.from(idsToDelete),
      postId,
      commentCount,
      message: 'Comment deleted successfully.',
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
}
