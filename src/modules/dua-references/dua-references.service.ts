import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateDuaReferenceDto } from './dto/create-dua-reference.dto';
import { UpdateDuaReferenceDto } from './dto/update-dua-reference.dto';

@Injectable()
export class DuaReferencesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(duaId: string, dto: CreateDuaReferenceDto) {
    const dua = await this.prisma.dua.findUnique({
      where: { id: duaId },
    });
    if (!dua) {
      throw new NotFoundException(`Dua with ID '${duaId}' not found.`);
    }

    const source = await this.prisma.source.findUnique({
      where: { id: dto.sourceId },
    });
    if (!source) {
      throw new BadRequestException(
        `Source with ID '${dto.sourceId}' does not exist.`,
      );
    }

    return this.prisma.duaReference.create({
      data: {
        duaId,
        sourceId: dto.sourceId,
        reference: dto.reference.trim(),
        note: dto.note?.trim(),
        verified: dto.verified ?? false,
      },
      include: {
        source: true,
      },
    });
  }

  async findAllByDuaId(duaId: string) {
    const dua = await this.prisma.dua.findUnique({
      where: { id: duaId },
    });
    if (!dua) {
      throw new NotFoundException(`Dua with ID '${duaId}' not found.`);
    }

    return this.prisma.duaReference.findMany({
      where: { duaId },
      include: {
        source: true,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async update(
    duaId: string,
    referenceId: string,
    dto: UpdateDuaReferenceDto,
  ) {
    const reference = await this.prisma.duaReference.findFirst({
      where: { id: referenceId, duaId },
    });
    if (!reference) {
      throw new NotFoundException(
        `Reference with ID '${referenceId}' for Dua '${duaId}' not found.`,
      );
    }

    if (dto.sourceId && dto.sourceId !== reference.sourceId) {
      const source = await this.prisma.source.findUnique({
        where: { id: dto.sourceId },
      });
      if (!source) {
        throw new BadRequestException(
          `Source with ID '${dto.sourceId}' does not exist.`,
        );
      }
    }

    return this.prisma.duaReference.update({
      where: { id: referenceId },
      data: {
        ...(dto.sourceId && { sourceId: dto.sourceId }),
        ...(dto.reference && { reference: dto.reference.trim() }),
        ...(dto.note !== undefined && { note: dto.note?.trim() }),
        ...(dto.verified !== undefined && { verified: dto.verified }),
      },
      include: {
        source: true,
      },
    });
  }

  async remove(duaId: string, referenceId: string) {
    const reference = await this.prisma.duaReference.findFirst({
      where: { id: referenceId, duaId },
    });
    if (!reference) {
      throw new NotFoundException(
        `Reference with ID '${referenceId}' for Dua '${duaId}' not found.`,
      );
    }

    await this.prisma.duaReference.delete({
      where: { id: referenceId },
    });

    return { message: 'Dua reference deleted successfully.' };
  }
}
