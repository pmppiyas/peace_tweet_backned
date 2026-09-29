import { UsersService } from '../../../modules/users/users.service';
import { prisma } from '../../config/prisma';
import { friendsServices } from '../friends/friends.services';
import { IChangePasswordInput, IUpdateUserInput } from './users.interface';

const serviceInstance = new UsersService(prisma as any, friendsServices.instance);

const findById = (id: string) => serviceInstance.findById(id);

const findByUsername = (username: string, viewerId?: string) =>
  serviceInstance.findByUsername(username, viewerId);

const update = (id: string, dto: IUpdateUserInput) => serviceInstance.update(id, dto as any);

const changePassword = (userId: string, dto: IChangePasswordInput) =>
  serviceInstance.changePassword(userId, dto);

export const usersServices = {
  findById,
  findByUsername,
  update,
  changePassword,
};
