import { BloodGroup, BloodRequestStatus, BloodRequestUrgency } from '@prisma/client';

export interface ICreateBloodRequestInput {
  forMyself?: boolean;
  patientName: string;
  patientAge?: number;
  problem?: string;
  bloodGroup: BloodGroup;
  units?: number;
  hospitalName: string;
  hospitalAddress?: string;
  location: string;
  contactNumber: string;
  alternateContact?: string;
  neededDate: string | Date;
  urgency?: BloodRequestUrgency;
  note?: string;
}

export interface IUpdateBloodRequestStatusInput {
  status: BloodRequestStatus;
}

export interface IBloodRequestQuery {
  bloodGroup?: BloodGroup;
  status?: BloodRequestStatus;
  urgency?: BloodRequestUrgency;
  location?: string;
  search?: string;
  cursor?: string;
  page?: string | number;
  limit?: string | number;
}

export interface IDonorQuery {
  bloodGroup?: BloodGroup;
  location?: string;
  search?: string;
  page?: string | number;
  limit?: string | number;
}
