import { DuasService } from '../../../modules/duas/duas.service';
import { cacheService } from '../../config/cache';
import { prisma } from '../../config/prisma';
import { ICreateDuaInput, IUpdateDuaInput } from './duas.interface';

const serviceInstance = new DuasService(prisma as any, cacheService as any);

const create = (dto: ICreateDuaInput, createdById: string) =>
  serviceInstance.create(dto as any, createdById);

const findAll = (query: any, user?: any) =>
  serviceInstance.findAll(
    {
      page: query.page ? Number(query.page) : 1,
      limit: query.limit ? Number(query.limit) : 12,
      search: query.search,
      categoryId: query.categoryId,
      status: query.status,
    },
    user,
  );

const findOne = (id: string, user?: any) => serviceInstance.findOne(id, user);

const update = (id: string, dto: IUpdateDuaInput) => serviceInstance.update(id, dto as any);

const remove = (id: string) => serviceInstance.remove(id);

export const duasServices = {
  create,
  findAll,
  findOne,
  update,
  remove,
};
