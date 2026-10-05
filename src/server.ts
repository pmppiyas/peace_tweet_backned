import { createServer, Server } from 'http';
import app from './app';
import { envVar } from './app/config/env';
import { prisma } from './app/config/prisma';
import { initSocket } from './socket';

let server: Server;

async function bootstrap() {
  try {
    await prisma.$connect();
    console.log('✅ PostgreSQL Database connected via Prisma');

    const httpServer = createServer(app);
    initSocket(httpServer);

    server = httpServer.listen(envVar.PORT, () => {
      console.log(
        `🚀 PeaceTweet Express Server running on: http://localhost:${envVar.PORT}/${envVar.API_PREFIX}`,
      );
      console.log('⚡ Socket.io Gateway initialized');
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

const gracefulShutdown = async (signal: string) => {
  // eslint-disable-next-line no-console
  console.log(`\n${signal} received. Closing HTTP server and Prisma connection...`);
  if (server) {
    server.close(async () => {
      await prisma.$disconnect();
      process.exit(0);
    });
  } else {
    await prisma.$disconnect();
    process.exit(0);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

bootstrap();
