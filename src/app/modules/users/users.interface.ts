import { BloodGroup } from '@prisma/client';

export interface IUpdateUserInput {
  name?: string;
  username?: string;
  email?: string;
  avatarUrl?: string;
  location?: string;
  bloodGroup?: BloodGroup;
}

export interface IChangePasswordInput {
  currentPassword?: string;
  newPassword: string;
}
