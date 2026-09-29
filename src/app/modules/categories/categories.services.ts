import { CategoriesService } from '../../../modules/categories/categories.service';
import { cacheService } from '../../config/cache';
import { prisma } from '../../config/prisma';
import { ICreateCategoryInput, IUpdateCategoryInput } from './categories.interface';

const serviceInstance = new CategoriesService(prisma as any, cacheService as any);

const create = (dto: ICreateCategoryInput) => serviceInstance.create(dto as any);

const findAll = (query: any) =>
  serviceInstance.findAll({
    page: query.page ? Number(query.page) : 1,
    limit: query.limit ? Number(query.limit) : 50,
    search: query.search,
  });

const findOne = (idOrSlug: string) => serviceInstance.findOne(idOrSlug);

const update = (id: string, dto: IUpdateCategoryInput) => serviceInstance.update(id, dto as any);

const remove = (id: string) => serviceInstance.remove(id);

export const categoriesServices = {
  create,
  findAll,
  findOne,
  update,
  remove,
};
