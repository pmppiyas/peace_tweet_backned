import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../database/prisma.service';
import { FriendsService } from '../friends/friends.service';
import { ChangePasswordDto } from './dto/change-password.dto';
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
        avatarUrl: true,
        coverUrl: true,
        country: true,
        countryCode: true,
        state: true,
        city: true,
        location: true,
        bloodGroup: true,
        bio: true,
        badge: true,
        userStatus: true,
        isDonor: true,
        donationCount: true,
        passwordHash: true,
        needPasswordUpdate: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException(`User with ID '${id}' not found.`);
    }

    const { passwordHash, ...rest } = user;
    return {
      ...rest,
      hasPassword: Boolean(passwordHash),
      needPasswordUpdate: user.needPasswordUpdate ?? !passwordHash,
    };
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
        avatarUrl: true,
        coverUrl: true,
        country: true,
        countryCode: true,
        state: true,
        city: true,
        location: true,
        bloodGroup: true,
        bio: true,
        badge: true,
        userStatus: true,
        isDonor: true,
        donationCount: true,
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

  // Update user profile details
  async update(id: string, dto: UpdateUserDto): Promise<UserDto> {
    await this.findById(id);

    const updateData: Record<string, unknown> = {};

    if (dto.name !== undefined) {
      updateData.name = dto.name.trim();
    }

    // Check username uniqueness if updating username
    if (dto.username !== undefined) {
      const normalizedUsername = dto.username.trim().toLowerCase();
      const existingUser = await this.prisma.user.findFirst({
        where: {
          username: normalizedUsername,
          NOT: { id },
        },
      });

      if (existingUser) {
        throw new ConflictException('Username is already taken by another user.');
      }

      updateData.username = normalizedUsername;
    }

    // Check email uniqueness if updating email
    if (dto.email !== undefined) {
      const normalizedEmail = dto.email.trim().toLowerCase();
      const existingUser = await this.prisma.user.findFirst({
        where: {
          email: normalizedEmail,
          NOT: { id },
        },
      });

      if (existingUser) {
        throw new ConflictException('Email address is already registered by another account.');
      }

      updateData.email = normalizedEmail;
    }

    if (dto.avatarUrl !== undefined) {
      updateData.avatarUrl = dto.avatarUrl?.trim() || null;
    }

    if (dto.coverUrl !== undefined) {
      updateData.coverUrl = dto.coverUrl?.trim() || null;
    }

    if (dto.location !== undefined) {
      updateData.location = dto.location?.trim() || null;
    }

    if (dto.country !== undefined) {
      updateData.country = dto.country?.trim() || null;
    }

    if (dto.countryCode !== undefined) {
      updateData.countryCode = dto.countryCode?.trim() || null;
    }

    if (dto.state !== undefined) {
      updateData.state = dto.state?.trim() || null;
    }

    if (dto.city !== undefined) {
      updateData.city = dto.city?.trim() || null;
    }

    if (dto.bloodGroup !== undefined) {
      updateData.bloodGroup = dto.bloodGroup || null;
    }

    if (dto.bio !== undefined) {
      updateData.bio = dto.bio?.trim() || null;
    }

    if (dto.badge !== undefined) {
      updateData.badge = dto.badge?.trim();
    }

    if (dto.userStatus !== undefined) {
      updateData.userStatus = dto.userStatus;
    }

    if (dto.isDonor !== undefined) {
      updateData.isDonor = Boolean(dto.isDonor);
    }

    if (dto.donationCount !== undefined) {
      updateData.donationCount = Number(dto.donationCount);
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        role: true,
        avatarUrl: true,
        coverUrl: true,
        country: true,
        countryCode: true,
        state: true,
        city: true,
        location: true,
        bloodGroup: true,
        bio: true,
        badge: true,
        userStatus: true,
        isDonor: true,
        donationCount: true,
        passwordHash: true,
        needPasswordUpdate: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const { passwordHash, ...rest } = updated;
    return {
      ...rest,
      hasPassword: Boolean(passwordHash),
      needPasswordUpdate: updated.needPasswordUpdate ?? !passwordHash,
    };
  }

  // Set or change user password (social login accounts without a password can set one without currentPassword)
  async changePassword(userId: string, dto: ChangePasswordDto): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, passwordHash: true },
    });

    if (!user) {
      throw new NotFoundException('User not found.');
    }

    const hadPassword = Boolean(user.passwordHash);

    if (user.passwordHash) {
      if (!dto.currentPassword) {
        throw new BadRequestException('Please enter your current password.');
      }
      const isMatch = await bcrypt.compare(dto.currentPassword, user.passwordHash);
      if (!isMatch) {
        throw new BadRequestException('Current password does not match.');
      }
    }

    const salt = await bcrypt.genSalt(10);
    const newPasswordHash = await bcrypt.hash(dto.newPassword, salt);

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash: newPasswordHash,
        needPasswordUpdate: false,
      },
    });

    return {
      message: hadPassword
        ? 'Password changed successfully.'
        : 'Password set successfully! You can now also sign in with your email and password.',
    };
  }
}
