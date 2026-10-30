import { BloodGroup, BloodRequestStatus } from '@prisma/client';

export interface ICreateBloodRequestInput {
  forMyself?: boolean;
  patientName: string;
  patientAge?: number;
  problem?: string;
  bloodGroup: BloodGroup;
  units?: number;
  hospitalName: string;
  country?: string;
  countryCode?: string;
  state?: string;
  city?: string;
  location: string;
  contactNumber: string;
  alternateContact?: string;
  neededDate: string | Date;
}

export interface IUpdateBloodRequestStatusInput {
  status: BloodRequestStatus;
}

export interface IBloodRequestQuery {
  bloodGroup?: BloodGroup;
  status?: BloodRequestStatus;
  countryCode?: string;
  state?: string;
  city?: string;
  location?: string;
  search?: string;
  requesterId?: string;
  donorId?: string;
  cursor?: string;
  page?: string | number;
  limit?: string | number;
}

export interface IDonorQuery {
  bloodGroup?: BloodGroup;
  countryCode?: string;
  state?: string;
  city?: string;
  location?: string;
  search?: string;
  page?: string | number;
  limit?: string | number;
}
