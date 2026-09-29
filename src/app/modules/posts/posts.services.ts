import { PostsService } from '../../../modules/posts/posts.service';
import { prisma } from '../../config/prisma';
import {
  ICreateCommentInput,
  ICreatePostInput,
  IQueryFeed,
  IUpdatePostInput,
} from './posts.interface';

const serviceInstance = new PostsService(prisma as any);

const create = (dto: ICreatePostInput, authorId: string) =>
  serviceInstance.create(dto as any, authorId);

const getFeed = (query: IQueryFeed, user?: any) =>
  serviceInstance.getFeed(
    {
      cursor: query.cursor,
      limit: query.limit ? Number(query.limit) : 20,
      type: query.type as any,
    },
    user,
  );

const findOne = (id: string, user?: any) => serviceInstance.findOne(id, user);

const update = (id: string, dto: IUpdatePostInput, user: any) =>
  serviceInstance.update(id, dto as any, user);

const remove = (id: string, user: any) => serviceInstance.remove(id, user);

const savePost = (postId: string, userId: string) => serviceInstance.savePost(postId, userId);

const unsavePost = (postId: string, userId: string) => serviceInstance.unsavePost(postId, userId);

const react = (postId: string, userId: string) => serviceInstance.react(postId, userId);

const unreact = (postId: string, userId: string) => serviceInstance.unreact(postId, userId);

const getComments = (postId: string, limit = 50) => serviceInstance.getComments(postId, limit);

const createComment = (postId: string, userId: string, dto: ICreateCommentInput) =>
  serviceInstance.createComment(postId, userId, dto as any);

export const postsServices = {
  create,
  getFeed,
  findOne,
  update,
  remove,
  savePost,
  unsavePost,
  react,
  unreact,
  getComments,
  createComment,
};
