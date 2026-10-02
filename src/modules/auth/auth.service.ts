import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { Role } from '../../common/enums/role.enum';
import { PrismaService } from '../../database/prisma.service';
import { AuthResponseDto, TokenRefreshResponseDto, UserProfileDto } from './dto/auth-response.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  // Generate a URL-safe slug from a display name
  private generateUsernameSlug(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9_-]/g, '')
      .substring(0, 20);
  }

  // Produce a unique username, appending a random hex suffix when needed
  private async resolveUsername(base: string): Promise<string> {
    const slug = this.generateUsernameSlug(base) || 'user';
    let candidate = slug;
    let attempts = 0;
    while (attempts < 10) {
      const conflict = await this.prisma.user.findUnique({ where: { username: candidate } });
      if (!conflict) return candidate;
      const suffix = Math.random().toString(16).substring(2, 6);
      candidate = `${slug}_${suffix}`;
      attempts++;
    }
    // Fallback: full random username
    return `user_${Math.random().toString(16).substring(2, 10)}`;
  }

  async register(dto: RegisterDto): Promise<AuthResponseDto> {
    const existingEmail = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    if (existingEmail) {
      throw new ConflictException('Email address is already registered.');
    }

    // Use provided username or auto-generate from name
    const resolvedUsername = dto.username
      ? dto.username.toLowerCase().trim()
      : await this.resolveUsername(dto.name);

    // If user explicitly supplied a username, check uniqueness
    if (dto.username) {
      const existingUsername = await this.prisma.user.findUnique({
        where: { username: resolvedUsername },
      });
      if (existingUsername) {
        throw new ConflictException('Username is already taken.');
      }
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(dto.password, salt);

    const user = await this.prisma.user.create({
      data: {
        name: dto.name.trim(),
        username: resolvedUsername,
        email: dto.email.toLowerCase().trim(),
        passwordHash,
        role: Role.USER,
        avatarUrl: dto.avatarUrl?.trim() || null,
        location: dto.location?.trim() || null,
        bloodGroup: dto.bloodGroup || null,
      },
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        role: true,
        avatarUrl: true,
        location: true,
        bloodGroup: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const tokens = await this.generateTokens(user.id, user.email, user.username, user.role);
    await this.updateRefreshTokenHash(user.id, tokens.refreshToken);

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user,
    };
  }

  async login(dto: LoginDto): Promise<AuthResponseDto> {
    const identifier = dto.identifier.toLowerCase().trim();

    const user = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: identifier }, { username: identifier }],
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials provided.');
    }

    if (!user.passwordHash) {
      throw new UnauthorizedException(
        'This account uses social login. Please sign in with your social account.',
      );
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials provided.');
    }

    const userProfile: UserProfileDto = {
      id: user.id,
      name: user.name,
      username: user.username,
      email: user.email,
      role: user.role,
      avatarUrl: user.avatarUrl,
      location: user.location,
      bloodGroup: user.bloodGroup,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    const tokens = await this.generateTokens(user.id, user.email, user.username, user.role);
    await this.updateRefreshTokenHash(user.id, tokens.refreshToken);

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: userProfile,
    };
  }

  async refreshTokens(refreshToken: string): Promise<TokenRefreshResponseDto> {
    try {
      const refreshSecret =
        this.configService.get<string>('JWT_REFRESH_SECRET') ||
        'islamic-dua-refresh-secret-key-change-in-production-min-32-chars';

      const payload = await this.jwtService.verifyAsync<{
        sub: string;
        email: string;
        username: string;
        role: Role;
      }>(refreshToken, {
        secret: refreshSecret,
      });

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });

      if (!user || !user.refreshToken) {
        throw new UnauthorizedException('Access Denied. Invalid refresh token session.');
      }

      const isRefreshTokenMatching = await bcrypt.compare(refreshToken, user.refreshToken);

      if (!isRefreshTokenMatching) {
        throw new UnauthorizedException('Access Denied. Expired or rotated refresh token.');
      }

      const tokens = await this.generateTokens(user.id, user.email, user.username, user.role);
      await this.updateRefreshTokenHash(user.id, tokens.refreshToken);

      return tokens;
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token.');
    }
  }

  async logout(userId: string): Promise<{ message: string }> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshToken: null },
    });
    return { message: 'Logged out successfully' };
  }

  async getMe(userId: string): Promise<UserProfileDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        role: true,
        avatarUrl: true,
        location: true,
        bloodGroup: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    return user;
  }

  private async generateTokens(
    userId: string,
    email: string,
    username: string,
    role: Role,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const payload = { sub: userId, email, username, role };

    const accessSecret =
      this.configService.get<string>('JWT_ACCESS_SECRET') ||
      'islamic-dua-access-secret-key-change-in-production-min-32-chars';
    const refreshSecret =
      this.configService.get<string>('JWT_REFRESH_SECRET') ||
      'islamic-dua-refresh-secret-key-change-in-production-min-32-chars';

    const accessExpiresIn = this.configService.get<string>('JWT_ACCESS_EXPIRES_IN') || '15m';
    const refreshExpiresIn = this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') || '7d';

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: accessSecret,
        expiresIn: accessExpiresIn,
      }),
      this.jwtService.signAsync(payload, {
        secret: refreshSecret,
        expiresIn: refreshExpiresIn,
      }),
    ]);

    return {
      accessToken,
      refreshToken,
    };
  }

  private async updateRefreshTokenHash(userId: string, refreshToken: string): Promise<void> {
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(refreshToken, salt);
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshToken: hash },
    });
  }
}
