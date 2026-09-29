import { DuaReferencesService } from '../../../modules/dua-references/dua-references.service';
import { prisma } from '../../config/prisma';
import { ICreateDuaReferenceInput, IUpdateDuaReferenceInput } from './dua-references.interface';

const serviceInstance = new DuaReferencesService(prisma as any);

const create = (duaId: string, dto: ICreateDuaReferenceInput) =>
  serviceInstance.create(duaId, dto as any);

const findAllByDuaId = (duaId: string) => serviceInstance.findAllByDuaId(duaId);

const update = (duaId: string, referenceId: string, dto: IUpdateDuaReferenceInput) =>
  serviceInstance.update(duaId, referenceId, dto as any);

const remove = (duaId: string, referenceId: string) => serviceInstance.remove(duaId, referenceId);

export const duaReferencesServices = {
  create,
  findAllByDuaId,
  update,
  remove,
};
