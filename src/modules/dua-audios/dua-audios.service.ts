import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateDuaAudioDto } from './dto/create-dua-audio.dto';
import { UpdateDuaAudioDto } from './dto/update-dua-audio.dto';

@Injectable()
export class DuaAudiosService {
  constructor(private readonly prisma: PrismaService) {}

  async create(duaId: string, dto: CreateDuaAudioDto) {
    const dua = await this.prisma.dua.findUnique({
      where: { id: duaId },
    });
    if (!dua) {
      throw new NotFoundException(`Dua with ID '${duaId}' not found.`);
    }

    return this.prisma.duaAudio.create({
      data: {
        duaId,
        audioUrl: dto.audioUrl.trim(),
        reciterName: dto.reciterName?.trim(),
        duration: dto.duration,
        language: dto.language?.trim(),
        verified: dto.verified ?? false,
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

    return this.prisma.duaAudio.findMany({
      where: { duaId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async update(duaId: string, audioId: string, dto: UpdateDuaAudioDto) {
    const audio = await this.prisma.duaAudio.findFirst({
      where: { id: audioId, duaId },
    });
    if (!audio) {
      throw new NotFoundException(
        `Audio with ID '${audioId}' for Dua '${duaId}' not found.`,
      );
    }

    return this.prisma.duaAudio.update({
      where: { id: audioId },
      data: {
        ...(dto.audioUrl && { audioUrl: dto.audioUrl.trim() }),
        ...(dto.reciterName !== undefined && { reciterName: dto.reciterName?.trim() }),
        ...(dto.duration !== undefined && { duration: dto.duration }),
        ...(dto.language !== undefined && { language: dto.language?.trim() }),
        ...(dto.verified !== undefined && { verified: dto.verified }),
      },
    });
  }

  async remove(duaId: string, audioId: string) {
    const audio = await this.prisma.duaAudio.findFirst({
      where: { id: audioId, duaId },
    });
    if (!audio) {
      throw new NotFoundException(
        `Audio with ID '${audioId}' for Dua '${duaId}' not found.`,
      );
    }

    await this.prisma.duaAudio.delete({
      where: { id: audioId },
    });

    return { message: 'Dua audio recording deleted successfully.' };
  }
}
