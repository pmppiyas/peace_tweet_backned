import { AuthProvider, Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import httpStatus from 'http-status-codes';
import { envVar } from '../../config/env';
import { prisma } from '../../config/prisma';
import { cacheService } from '../../config/cache';
import { generateToken } from '../../helper/jwtTokenGen';
import { verifyToken } from '../../helper/verifyToken';
import AppError from '../../utils/appError';
import {
  IAuthResponse,
  IFacebookLoginInput,
  ILoginInput,
  IRegisterInput,
  IUserProfile,
} from './auth.interface';

const generateUsernameSlug = (name: string): string => {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_-]/g, '')
    .substring(0, 20);
};

const resolveUsername = async (base: string): Promise<string> => {
  const slug = generateUsernameSlug(base) || 'user';
  let candidate = slug.length >= 3 ? slug : `${slug}_user`;
  let attempts = 0;

  while (attempts < 10) {
    const conflict = await prisma.user.findUnique({
      where: { username: candidate },
    });
    if (!conflict) return candidate;
    const suffix = Math.random().toString(16).substring(2, 6);
    candidate = `${slug}_${suffix}`;
    attempts++;
  }

  return `user_${Math.random().toString(16).substring(2, 10)}`;
};

const createAuthTokens = (userId: string, email: string, username: string, role: Role) => {
  const payload = { id: userId, sub: userId, email, username, role };
  const accessToken = generateToken(payload, envVar.JWT_SOLT, envVar.JWT_ACCESS_EXPIRES_IN);
  const refreshToken = generateToken(
    payload,
    envVar.JWT_REFRESH_SECRET,
    envVar.JWT_REFRESH_EXPIRES_IN,
  );
  return { accessToken, refreshToken };
};

const updateRefreshTokenHash = async (userId: string, refreshToken: string): Promise<void> => {
  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash(refreshToken, salt);
  await prisma.user.update({
    where: { id: userId },
    data: { refreshToken: hash },
  });
};

const register = async (dto: IRegisterInput): Promise<IAuthResponse> => {
  const existingEmail = await prisma.user.findUnique({
    where: { email: dto.email.toLowerCase().trim() },
  });
  if (existingEmail) {
    throw new AppError(httpStatus.CONFLICT, 'Email address is already registered.');
  }

  const resolvedUsername = dto.username
    ? dto.username.toLowerCase().trim()
    : await resolveUsername(dto.name);

  if (dto.username) {
    const existingUsername = await prisma.user.findUnique({
      where: { username: resolvedUsername },
    });
    if (existingUsername) {
      throw new AppError(httpStatus.CONFLICT, 'Username is already taken.');
    }
  }

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(dto.password, salt);

  const user = await prisma.user.create({
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

  const tokens = createAuthTokens(user.id, user.email, user.username, user.role);
  await updateRefreshTokenHash(user.id, tokens.refreshToken);

  return {
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    user: { ...user, hasPassword: true, needPasswordUpdate: false },
  };
};

const login = async (dto: ILoginInput): Promise<IAuthResponse> => {
  const identifier = dto.identifier.toLowerCase().trim();

  const user = await prisma.user.findFirst({
    where: {
      OR: [{ email: identifier }, { username: identifier }],
    },
  });

  if (!user) {
    throw new AppError(httpStatus.UNAUTHORIZED, 'Invalid credentials provided.');
  }

  if (!user.passwordHash) {
    throw new AppError(
      httpStatus.UNAUTHORIZED,
      'This account uses social login and has no password set yet. Please sign in with your social account first and set a password in Settings.',
    );
  }

  const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
  if (!isPasswordValid) {
    throw new AppError(httpStatus.UNAUTHORIZED, 'Invalid credentials provided.');
  }

  const userProfile: IUserProfile = {
    id: user.id,
    name: user.name,
    username: user.username,
    email: user.email,
    role: user.role,
    avatarUrl: user.avatarUrl,
    location: user.location,
    bloodGroup: user.bloodGroup,
    isDonor: user.isDonor,
    donationCount: user.donationCount,
    hasPassword: true,
    needPasswordUpdate: user.needPasswordUpdate ?? false,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };

  const tokens = createAuthTokens(user.id, user.email, user.username, user.role);
  await updateRefreshTokenHash(user.id, tokens.refreshToken);

  return {
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    user: userProfile,
  };
};

const refreshTokens = async (
  refreshToken: string,
): Promise<{ accessToken: string; refreshToken: string }> => {
  const payload = verifyToken(refreshToken, envVar.JWT_REFRESH_SECRET);
  const userId = (payload.id || payload.sub) as string;

  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user || !user.refreshToken) {
    throw new AppError(httpStatus.UNAUTHORIZED, 'Access Denied. Invalid refresh token session.');
  }

  const isRefreshTokenMatching = await bcrypt.compare(refreshToken, user.refreshToken);

  if (!isRefreshTokenMatching) {
    throw new AppError(httpStatus.UNAUTHORIZED, 'Access Denied. Expired or rotated refresh token.');
  }

  const tokens = createAuthTokens(user.id, user.email, user.username, user.role);
  await updateRefreshTokenHash(user.id, tokens.refreshToken);

  return tokens;
};

const logout = async (userId: string): Promise<{ message: string }> => {
  await prisma.user.update({
    where: { id: userId },
    data: { refreshToken: null },
  });
  await cacheService.delPattern(`user:*:${userId}*`).catch(() => {});
  return { message: 'Logged out successfully' };
};

const getMe = async (userId: string): Promise<IUserProfile> => {
  const cacheKey = `user:me:${userId}`;
  return cacheService.remember(cacheKey, 300, async () => {
    const user = await prisma.user.findUnique({
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
        isDonor: true,
        donationCount: true,
        passwordHash: true,
        needPasswordUpdate: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new AppError(httpStatus.BAD_REQUEST, 'User not found');
    }

    const { passwordHash, ...rest } = user;
    return {
      ...rest,
      hasPassword: Boolean(passwordHash),
      needPasswordUpdate: user.needPasswordUpdate ?? !passwordHash,
    };
  });
};

interface IFacebookProfile {
  id: string;
  name: string;
  email?: string;
  picture?: { data?: { url?: string } };
}

const exchangeFacebookCodeForToken = async (
  code: string,
  redirectUri?: string,
): Promise<string> => {
  const clientId = envVar.META_APP_ID;
  const clientSecret = envVar.META_APP_SECRET;
  const targetRedirectUri = redirectUri || envVar.META_REDIRECT_URI;

  if (!clientId || !clientSecret) {
    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'Facebook OAuth credentials are not configured on the server.',
    );
  }

  const tokenUrl = new URL('https://graph.facebook.com/v19.0/oauth/access_token');
  tokenUrl.searchParams.set('client_id', clientId);
  tokenUrl.searchParams.set('redirect_uri', targetRedirectUri);
  tokenUrl.searchParams.set('client_secret', clientSecret);
  tokenUrl.searchParams.set('code', code);

  const response = await fetch(tokenUrl.toString());
  const data = (await response.json()) as {
    access_token?: string;
    error?: { message?: string };
  };

  if (!response.ok || !data.access_token) {
    throw new AppError(
      httpStatus.UNAUTHORIZED,
      data.error?.message || 'Failed to exchange Facebook authorization code.',
    );
  }

  return data.access_token;
};

const verifyFacebookToken = async (accessToken: string): Promise<IFacebookProfile> => {
  const graphUrl = new URL('https://graph.facebook.com/me');
  graphUrl.searchParams.set('fields', 'id,name,email,picture.type(large)');
  graphUrl.searchParams.set('access_token', accessToken);

  const response = await fetch(graphUrl.toString());

  if (!response.ok) {
    throw new AppError(httpStatus.UNAUTHORIZED, 'Invalid Facebook access token.');
  }

  const profile = (await response.json()) as IFacebookProfile;

  if (!profile.id) {
    throw new AppError(httpStatus.UNAUTHORIZED, 'Could not retrieve Facebook profile.');
  }

  return profile;
};

const facebookLogin = async (dto: IFacebookLoginInput): Promise<IAuthResponse> => {
  let token = dto.accessToken;

  if (!token && dto.code) {
    token = await exchangeFacebookCodeForToken(dto.code, dto.redirectUri);
  }

  if (!token) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Facebook code or access token is required.');
  }

  const fbProfile = await verifyFacebookToken(token);

  // 1. Look up by facebookId first
  let user = await prisma.user.findUnique({
    where: { facebookId: fbProfile.id },
  });

  if (!user && fbProfile.email) {
    // 2. Look up by email — link existing account
    user = await prisma.user.findUnique({
      where: { email: fbProfile.email.toLowerCase().trim() },
    });

    if (user) {
      // Link Facebook to existing account
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          facebookId: fbProfile.id,
          avatarUrl: user.avatarUrl || fbProfile.picture?.data?.url || null,
        },
      });
    }
  }

  if (!user) {
    // 3. Create new user from profile
    const email = fbProfile.email
      ? fbProfile.email.toLowerCase().trim()
      : `member_${fbProfile.id}@social.placeholder`;

    const resolvedUsername = await resolveUsername(fbProfile.name || 'member');

    user = await prisma.user.create({
      data: {
        name: fbProfile.name || 'PeaceTweet Member',
        username: resolvedUsername,
        email,
        passwordHash: null,
        needPasswordUpdate: true,
        facebookId: fbProfile.id,
        authProvider: AuthProvider.FACEBOOK,
        role: Role.USER,
        avatarUrl: fbProfile.picture?.data?.url || null,
      },
    });
  }

  const userProfile: IUserProfile = {
    id: user.id,
    name: user.name,
    username: user.username,
    email: user.email,
    role: user.role,
    avatarUrl: user.avatarUrl,
    location: user.location,
    bloodGroup: user.bloodGroup,
    isDonor: user.isDonor,
    donationCount: user.donationCount,
    hasPassword: Boolean(user.passwordHash),
    needPasswordUpdate: user.needPasswordUpdate ?? !user.passwordHash,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };

  const tokens = createAuthTokens(user.id, user.email, user.username, user.role);
  await updateRefreshTokenHash(user.id, tokens.refreshToken);

  return {
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    user: userProfile,
  };
};

export const authServices = {
  register,
  login,
  facebookLogin,
  refreshTokens,
  logout,
  getMe,
};
