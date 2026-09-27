import { Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../database/prisma.service';
import { FriendsService } from '../friends/friends.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserDto, UserProfileDto } from './dto/user-response.dto';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly friendsService: FriendsService,
  ) {}

  // Find user by ID
  async findById(id: string): Promise<UserDto> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException(`User with ID '${id}' not found.`);
    }

    return user;
  }

  // Find public user profile by username with relationship status
  async findByUsername(username: string, viewerId?: string): Promise<UserProfileDto> {
    const user = await this.prisma.user.findUnique({
      where: { username },
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException(`User with username '${username}' not found.`);
    }

    const friendship = await this.friendsService.getRelationshipStatus(viewerId, user.id);

    return {
      ...user,
      friendship,
    };
  }

  // Update user profile
  async update(id: string, dto: UpdateUserDto): Promise<UserDto> {
    await this.findById(id);

    const updateData: Record<string, unknown> = {};

    if (dto.name) {
      updateData.name = dto.name.trim();
    }

    if (dto.password) {
      const salt = await bcrypt.genSalt(10);
      updateData.passwordHash = await bcrypt.hash(dto.password, salt);
    }

    return this.prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }
}
