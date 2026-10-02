import { BloodGroup, BloodRequestStatus, BloodRequestUrgency } from '@prisma/client';
import { z } from 'zod';

export const createBloodRequestZodSchema = z.object({
  forMyself: z.boolean().optional(),
  patientName: z.string({
    required_error: 'Patient name is required',
  }).min(1, 'Patient name cannot be empty').trim(),
  patientAge: z.number().int().positive('Age must be a positive number').optional().nullable(),
  problem: z.string().optional().nullable(),
  bloodGroup: z.nativeEnum(BloodGroup, {
    required_error: 'Valid blood group is required',
  }),
  units: z.number().int().min(1, 'At least 1 unit is required').max(20).default(1),
  hospitalName: z.string({
    required_error: 'Hospital name is required',
  }).min(1, 'Hospital name cannot be empty').trim(),
  hospitalAddress: z.string().optional().nullable(),
  location: z.string({
    required_error: 'Location or District is required',
  }).min(1, 'Location cannot be empty').trim(),
  contactNumber: z.string({
    required_error: 'Primary contact number is required',
  }).min(6, 'Valid contact number is required').trim(),
  alternateContact: z.string().optional().nullable(),
  neededDate: z.string({
    required_error: 'Needed date is required',
  }).or(z.date()),
  urgency: z.nativeEnum(BloodRequestUrgency).optional(),
  note: z.string().optional().nullable(),
});

export const updateBloodRequestStatusZodSchema = z.object({
  status: z.nativeEnum(BloodRequestStatus, {
    required_error: 'Status is required',
  }),
});

export const toggleDonorModeZodSchema = z.object({
  isDonor: z.boolean().optional(),
}).optional();
