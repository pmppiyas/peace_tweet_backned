import { BloodGroup } from '@prisma/client';

export interface IUpdateUserInput {
  name?: string;
  username?: string;
  email?: string;
  avatarUrl?: string;
  coverUrl?: string;
  location?: string | null;
  country?: string | null;
  countryCode?: string | null;
  state?: string | null;
  city?: string | null;
  bloodGroup?: BloodGroup;
  bio?: string;
  badge?: string;
  userStatus?: any;
  isDonor?: boolean;
  donationCount?: number;
}

export interface IChangePasswordInput {
  currentPassword?: string;
  newPassword: string;
}
