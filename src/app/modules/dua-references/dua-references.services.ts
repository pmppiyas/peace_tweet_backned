import { DuaReferencesService } from '../../../modules/dua-references/dua-references.service';
import { prisma } from '../../config/prisma';
import { cacheService } from '../../config/cache';
import { ICreateDuaReferenceInput, IUpdateDuaReferenceInput } from './dua-references.interface';

const serviceInstance = new DuaReferencesService(prisma as any);

const invalidateReferenceCache = async (duaId: string) => {
  try {
    await cacheService.delPattern(`duas:references:${duaId}*`);
    await cacheService.delPattern(`duas:id:${duaId}*`);
    await cacheService.delPattern('duas:list:*');
  } catch (err: any) {
    console.warn('Dua reference cache invalidation failed:', err.message);
  }
};

const create = async (duaId: string, dto: ICreateDuaReferenceInput) => {
  const result = await serviceInstance.create(duaId, dto as any);
  await invalidateReferenceCache(duaId);
  return result;
};

const findAllByDuaId = (duaId: string) => {
  const cacheKey = `duas:references:${duaId}`;
  return cacheService.remember(cacheKey, 300, () => serviceInstance.findAllByDuaId(duaId));
};

const update = async (duaId: string, referenceId: string, dto: IUpdateDuaReferenceInput) => {
  const result = await serviceInstance.update(duaId, referenceId, dto as any);
  await invalidateReferenceCache(duaId);
  return result;
};

const remove = async (duaId: string, referenceId: string) => {
  const result = await serviceInstance.remove(duaId, referenceId);
  await invalidateReferenceCache(duaId);
  return result;
};

export const duaReferencesServices = {
  create,
  findAllByDuaId,
  update,
  remove,
};
