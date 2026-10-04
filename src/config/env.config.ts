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
    host?: string;
    port?: number;
    password?: string;
    url?: string;
  };
  kafka: {
    brokers: string[];
    clientId: string;
    groupId: string;
  };
  media: {
    uploadDir: string;
  };
  admin: {
    email: string;
    password: string;
    name: string;
    username: string;
  };
}

export const envConfig = (): EnvConfig => {
  const adminEmail = process.env.ADMIN_EMAIL || '';

  const kafkaBrokersRaw = process.env.KAFKA_BROKERS || '';
  const kafkaBrokers = kafkaBrokersRaw ? kafkaBrokersRaw.split(',').map((b) => b.trim()) : [];

  return {
    port: parseInt(process.env.PORT || '0', 10),
    nodeEnv: process.env.NODE_ENV || '',
    appName: process.env.APP_NAME || '',
    apiPrefix: process.env.API_PREFIX || '',
    corsOrigin: process.env.CORS_ORIGIN || '',
    databaseUrl: process.env.DATABASE_URL || '',
    jwt: {
      accessSecret: process.env.JWT_ACCESS_SECRET || '',
      refreshSecret: process.env.JWT_REFRESH_SECRET || '',
      accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '',
      refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '',
    },
    redis: {
      host: process.env.REDIS_HOST || undefined,
      port: process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT, 10) : undefined,
      password: process.env.REDIS_PASSWORD || undefined,
      url:
        process.env.Service_URI || process.env['Service URI'] || process.env.REDIS_URL || undefined,
    },
    kafka: {
      brokers: kafkaBrokers,
      clientId: process.env.KAFKA_CLIENT_ID || '',
      groupId: process.env.KAFKA_GROUP_ID || '',
    },
    media: {
      uploadDir: process.env.MEDIA_UPLOAD_DIR || '',
    },
    admin: {
      email: adminEmail,
      password: process.env.ADMIN_PASSWORD || '',
      name: process.env.ADMIN_NAME || '',
      username: process.env.ADMIN_USERNAME || '',
    },
  };
};

export default envConfig;
