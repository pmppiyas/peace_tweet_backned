import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { Application, NextFunction, Request, Response } from 'express';
import * as fs from 'fs';
import httpStatus from 'http-status-codes';
import * as path from 'path';
import { envVar } from './app/config/env';
import { globalErrorHandler } from './app/middleware/globalErrorHandler';
import { router } from './app/routes/routes';

const app: Application = express();

// Ensure upload directories exist
const uploadsDir = path.join(process.cwd(), 'uploads');
const videosDir = path.join(uploadsDir, 'videos');
const audiosDir = path.join(uploadsDir, 'audios');
[uploadsDir, videosDir, audiosDir].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// CORS Configuration
app.use(
  cors({
    origin:
      envVar.CORS_ORIGIN === '*'
        ? true
        : envVar.CORS_ORIGIN.split(',').map((origin) => origin.trim()),
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    credentials: true,
  }),
);

// Global Middlewares
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static Uploads Serving
app.use('/uploads', express.static(uploadsDir));

// Health Check
app.get(['/', '/api/v1/health'], (_req: Request, res: Response) => {
  res.status(httpStatus.OK).json({
    success: true,
    statusCode: httpStatus.OK,
    message: 'PeaceTweet Express + Prisma + Zod API is running smoothly!',
    data: {
      timestamp: new Date().toISOString(),
      environment: envVar.NODE_ENV,
    },
  });
});

// Central API Router (/api/v1)
app.use(`/${envVar.API_PREFIX.replace(/^\//, '')}`, router);

// 404 Not Found Handler
app.use((req: Request, res: Response, _next: NextFunction) => {
  res.status(httpStatus.NOT_FOUND).json({
    success: false,
    statusCode: httpStatus.NOT_FOUND,
    message: `API Not Found: [${req.method}] ${req.originalUrl}`,
    errorSources: [
      {
        path: req.originalUrl,
        message: 'The requested API endpoint does not exist.',
      },
    ],
  });
});

// Global Error Handler
app.use(globalErrorHandler);

export default app;
