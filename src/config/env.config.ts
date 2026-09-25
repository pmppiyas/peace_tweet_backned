import * as dotenv from 'dotenv';
dotenv.config();

export interface EnvConfig {
  port: number;
  nodeEnv: string;
  appName: string;
  apiPrefix: string;
  corsOrigin: string;
  databaseUrl: string;
  jwt: {
    accessSecret: string;
    refreshSecret: string;
    accessExpiresIn: string;
    refreshExpiresIn: string;
  };
  redis: {
    host: string;
    port: number;
    password?: string;
    url?: string;
  };
  admin: {
    email: string;
    password: string;
    name: string;
    username: string;
  };
}

export const envConfig = (): EnvConfig => {
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
  const defaultUsername =
    adminEmail.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '') || 'admin';

  return {
    port: parseInt(process.env.PORT || '5000', 10),
    nodeEnv: process.env.NODE_ENV || 'development',
    appName: process.env.APP_NAME || 'Islamic Dua Platform API',
    apiPrefix: process.env.API_PREFIX || 'api/v1',
    corsOrigin: process.env.CORS_ORIGIN || '*',
    databaseUrl: process.env.DATABASE_URL || '',
    jwt: {
      accessSecret:
        process.env.JWT_ACCESS_SECRET ||
        'islamic-dua-access-secret-key-change-in-production-min-32-chars',
      refreshSecret:
        process.env.JWT_REFRESH_SECRET ||
        'islamic-dua-refresh-secret-key-change-in-production-min-32-chars',
      accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
      refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    },
    redis: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      password: process.env.REDIS_PASSWORD || undefined,
      url: process.env.REDIS_URL || undefined,
    },
    admin: {
      email: adminEmail,
      password: process.env.ADMIN_PASSWORD || 'Admin123!',
      name: process.env.ADMIN_NAME || 'System Admin',
      username: process.env.ADMIN_USERNAME || defaultUsername,
    },
  };
};

export default envConfig;
