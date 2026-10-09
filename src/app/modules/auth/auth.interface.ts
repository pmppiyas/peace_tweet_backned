import { BloodGroup, Role } from '@prisma/client';

export interface IRegisterInput {
  name: string;
  username?: string;
  email: string;
  password: string;
  avatarUrl?: string;
  country?: string;
  countryCode?: string;
  state?: string;
  city?: string;
  location?: string;
  bloodGroup?: BloodGroup;
}

export interface ILoginInput {
  identifier: string;
  password: string;
}

export interface IFacebookLoginInput {
  accessToken?: string;
  code?: string;
  redirectUri?: string;
}

export interface IRefreshTokenInput {
  refreshToken: string;
}

export interface IUserProfile {
  id: string;
  name: string;
  username: string;
  email: string;
  role: Role;
  avatarUrl?: string | null;
  country?: string | null;
  countryCode?: string | null;
  state?: string | null;
  city?: string | null;
  location?: string | null;
  bloodGroup?: BloodGroup | null;
  isDonor?: boolean;
  donationCount?: number;
  hasPassword?: boolean;
  needPasswordUpdate?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IAuthResponse {
  accessToken: string;
  refreshToken: string;
  user: IUserProfile;
}
