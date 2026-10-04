import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env') });

export const envVar = {
  NODE_ENV: process.env.NODE_ENV || '',
  PORT: Number(process.env.PORT) || 0,
  API_PREFIX: process.env.API_PREFIX || '',
  CORS_ORIGIN: process.env.CORS_ORIGIN || '',
  DATABASE_URL: process.env.DATABASE_URL || '',
  JWT_SOLT: process.env.JWT_SOLT || process.env.JWT_ACCESS_SECRET || '',
  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET || process.env.JWT_SOLT || '',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || '',
  JWT_ACCESS_EXPIRES_IN: process.env.JWT_ACCESS_EXPIRES_IN || '',
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '',
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME || '',
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY || '',
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET || '',
  META_APP_ID: process.env.META_APP_ID || '',
  META_APP_SECRET: process.env.META_APP_SECRET || '',
  META_REDIRECT_URI: process.env.META_REDIRECT_URI || '',
  REDIS_URL:
    process.env.Service_URI ||
    process.env['Service URI'] ||
    process.env.REDIS_URL ||
    '',
};
