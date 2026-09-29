import { SourcesService } from '../../../modules/sources/sources.service';
import { cacheService } from '../../config/cache';
import { prisma } from '../../config/prisma';
import { ICreateSourceInput, IUpdateSourceInput } from './sources.interface';

const serviceInstance = new SourcesService(prisma as any, cacheService as any);

const create = (dto: ICreateSourceInput) => serviceInstance.create(dto as any);

const findAll = (query: any) =>
  serviceInstance.findAll({
    page: query.page ? Number(query.page) : 1,
    limit: query.limit ? Number(query.limit) : 50,
    search: query.search,
    type: query.type,
  });

const findOne = (id: string) => serviceInstance.findOne(id);

const update = (id: string, dto: IUpdateSourceInput) => serviceInstance.update(id, dto as any);

const remove = (id: string) => serviceInstance.remove(id);

export const sourcesServices = {
  create,
  findAll,
  findOne,
  update,
  remove,
};
