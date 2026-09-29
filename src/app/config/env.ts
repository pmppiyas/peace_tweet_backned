import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env') });

export const envVar = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: Number(process.env.PORT) || 5000,
  API_PREFIX: process.env.API_PREFIX || 'api/v1',
  CORS_ORIGIN: process.env.CORS_ORIGIN || '*',
  DATABASE_URL: process.env.DATABASE_URL || '',
  JWT_SOLT:
    process.env.JWT_SOLT ||
    process.env.JWT_ACCESS_SECRET ||
    'islamic-dua-access-secret-key-change-in-production-min-32-chars',
  JWT_ACCESS_SECRET:
    process.env.JWT_ACCESS_SECRET ||
    process.env.JWT_SOLT ||
    'islamic-dua-access-secret-key-change-in-production-min-32-chars',
  JWT_REFRESH_SECRET:
    process.env.JWT_REFRESH_SECRET ||
    'islamic-dua-refresh-secret-key-change-in-production-min-32-chars',
  JWT_ACCESS_EXPIRES_IN: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME || '',
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY || '',
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET || '',
  FACEBOOK_APP_ID: process.env.META_APP_ID || process.env.FACEBOOK_APP_ID || '',
  FACEBOOK_APP_SECRET: process.env.META_APP_SECRET || process.env.FACEBOOK_APP_SECRET || '',
  FACEBOOK_REDIRECT_URI:
    process.env.META_REDIRECT_URI ||
    process.env.FACEBOOK_REDIRECT_URI ||
    'http://localhost:3000/auth/facebook/callback',
  META_APP_ID: process.env.META_APP_ID || process.env.FACEBOOK_APP_ID || '',
  META_APP_SECRET: process.env.META_APP_SECRET || process.env.FACEBOOK_APP_SECRET || '',
  META_REDIRECT_URI:
    process.env.META_REDIRECT_URI ||
    process.env.FACEBOOK_REDIRECT_URI ||
    'http://localhost:3000/auth/facebook/callback',
};
