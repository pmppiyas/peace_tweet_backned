import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as fs from 'fs';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT') || 5000;
  const apiPrefix = configService.get<string>('API_PREFIX') || 'api/v1';
  const corsOrigin = configService.get<string>('CORS_ORIGIN') || '*';

  // Ensure media upload directories exist
  const uploadsDir = join(process.cwd(), 'uploads');
  const videosDir = join(uploadsDir, 'videos');
  const audiosDir = join(uploadsDir, 'audios');
  [uploadsDir, videosDir, audiosDir].forEach((dir) => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });

  // Serve static assets from uploads directory
  app.useStaticAssets(uploadsDir, {
    prefix: '/uploads/',
  });


  app.enableCors({
    origin: corsOrigin === '*' ? true : corsOrigin.split(','),
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  app.setGlobalPrefix(apiPrefix);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  app.enableShutdownHooks();

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Islamic Dua Platform API')
    .setDescription(
      'Production-ready REST API for authentic Islamic Duas, categories, verified Quran & Hadith citations, audio recitations, and personalized user bookmarks.',
    )
    .setVersion('1.0.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Authorization',
        description: 'Enter JWT Bearer access token',
        in: 'header',
      },
      'JWT-auth',
    )
    .addTag('Health', 'System health checks')
    .addTag('Auth', 'User authentication and token management')
    .addTag('Users', 'User profile management')
    .addTag('Categories', 'Dua categories (সকাল-সন্ধ্যা, নামাজ, ঘুম, খাবার, etc.)')
    .addTag('Sources', 'Authentic sources (Quran, Sahih al-Bukhari, Sahih Muslim, etc.)')
    .addTag('Duas', 'Core Dua collection with multi-lingual content')
    .addTag('Dua References', 'Citations and Hadith verse linkings')
    .addTag('Dua Audios', 'Audio recitations and reciter metadata')
    .addTag('Saved Duas (Bookmarks)', 'User bookmarks and saved collections')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      docExpansion: 'none',
      filter: true,
    },
    customSiteTitle: 'Islamic Dua API Docs',
  });

  await app.listen(port);

  logger.log(`🚀 Islamic Dua Backend is running on: http://localhost:${port}/${apiPrefix}`);
  logger.log(`📖 Swagger API Documentation available at: http://localhost:${port}/docs`);
}

bootstrap();
