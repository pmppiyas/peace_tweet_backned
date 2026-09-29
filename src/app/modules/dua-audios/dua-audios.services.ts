import { DuaAudiosService } from '../../../modules/dua-audios/dua-audios.service';
import { cacheService } from '../../config/cache';
import { prisma } from '../../config/prisma';
import { ICreateDuaAudioInput, IUpdateDuaAudioInput } from './dua-audios.interface';

const serviceInstance = new DuaAudiosService(
  prisma as any,
  cacheService as any,
  { get: () => undefined } as any,
  { publish: async () => false } as any,
);

const create = (duaId: string, dto: ICreateDuaAudioInput) =>
  serviceInstance.create(duaId, dto as any);

const findAllByDuaId = (duaId: string) => serviceInstance.findAllByDuaId(duaId);

const update = (duaId: string, audioId: string, dto: IUpdateDuaAudioInput) =>
  serviceInstance.update(duaId, audioId, dto as any);

const remove = (duaId: string, audioId: string) => serviceInstance.remove(duaId, audioId);

export const duaAudiosServices = {
  create,
  findAllByDuaId,
  update,
  remove,
};
