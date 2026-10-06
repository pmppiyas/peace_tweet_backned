import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { JwtPayload } from 'jsonwebtoken';
import { envVar } from '../app/config/env';
import { verifyToken } from '../app/helper/verifyToken';
import { prisma } from '../app/config/prisma';
import { chatServices } from '../app/modules/chat/chat.services';
import { isOriginAllowed } from '../app/helper/corsHelper';

let io: SocketIOServer | null = null;

// Track online users connection count: userId -> active sockets
const onlineUsers = new Map<string, number>();

export const initSocket = (httpServer: HttpServer): SocketIOServer => {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: (origin, callback) => {
        if (isOriginAllowed(origin)) {
          callback(null, true);
        } else {
          callback(null, false);
        }
      },
      methods: ['GET', 'POST', 'PATCH', 'DELETE'],
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // Authentication Middleware for Socket.io
  io.use(async (socket: Socket, next) => {
    try {
      const authHeader = socket.handshake.auth?.token || socket.handshake.headers?.authorization;

      const cookieHeader = socket.handshake.headers?.cookie;
      let cookieToken: string | undefined;
      if (cookieHeader) {
        const match = cookieHeader.match(/accessToken=([^;]+)/);
        if (match) cookieToken = match[1];
      }

      const rawToken = authHeader?.startsWith('Bearer ')
        ? authHeader.split(' ')[1]
        : authHeader || cookieToken;

      if (!rawToken) {
        return next(new Error('Authentication error: No token provided'));
      }

      const decoded = verifyToken(rawToken, envVar.JWT_SOLT) as JwtPayload;
      const userId = (decoded.id || decoded.sub) as string;

      if (!userId) {
        return next(new Error('Authentication error: Invalid token payload'));
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          username: true,
          avatarUrl: true,
        },
      });

      if (!user) {
        return next(new Error('Authentication error: User not found'));
      }

      socket.data.user = user;
      next();
    } catch (err: any) {
      next(new Error(`Authentication error: ${err.message}`));
    }
  });

  io.on('connection', (socket: Socket) => {
    const user = socket.data.user;
    const userId = user.id;

    // Join personal private room for direct messaging & notifications
    socket.join(`user:${userId}`);

    // Update online status
    const currentCount = onlineUsers.get(userId) || 0;
    onlineUsers.set(userId, currentCount + 1);

    if (currentCount === 0) {
      // First connection -> Broadcast online status to others
      socket.broadcast.emit('user:status', {
        userId,
        status: 'online',
      });
    }

    // Send current list of online user IDs to the newly connected client
    const onlineUserIds = Array.from(onlineUsers.keys());
    socket.emit('users:online_list', onlineUserIds);

    // 1. Send Message Event
    socket.on(
      'message:send',
      async (
        payload: {
          receiverId: string;
          text: string;
          conversationId?: string;
        },
        callback?: (res: any) => void,
      ) => {
        try {
          if (!payload.receiverId || !payload.text?.trim()) {
            if (callback) callback({ success: false, error: 'Invalid message payload' });
            return;
          }

          const savedMessage = await chatServices.saveMessage(userId, payload);

          // Emit to receiver's private room
          io?.to(`user:${payload.receiverId}`).emit('message:received', savedMessage);

          // Emit to sender's own socket
          socket.emit('message:sent', savedMessage);

          // Emit conversation update (last message, timestamp) to both users
          const convUpdate = {
            conversationId: savedMessage.conversationId,
            lastMessageText: savedMessage.text,
            lastMessageAt: savedMessage.createdAt,
            senderId: userId,
          };

          io?.to(`user:${payload.receiverId}`).emit('conversation:updated', {
            ...convUpdate,
            unreadDelta: 1,
          });
          socket.emit('conversation:updated', {
            ...convUpdate,
            unreadDelta: 0,
          });

          if (callback) callback({ success: true, data: savedMessage });
        } catch (error: any) {
          if (callback) callback({ success: false, error: error.message });
        }
      },
    );

    // 2. Typing Indicator Event
    socket.on(
      'message:typing',
      (payload: { receiverId: string; conversationId: string; isTyping: boolean }) => {
        if (!payload.receiverId) return;
        io?.to(`user:${payload.receiverId}`).emit('message:typing', {
          senderId: userId,
          senderName: user.name,
          conversationId: payload.conversationId,
          isTyping: payload.isTyping,
        });
      },
    );

    // 3. Mark As Read / Seen Event
    socket.on(
      'message:read',
      async (
        payload: {
          conversationId: string;
          receiverId: string;
        },
        callback?: (res: any) => void,
      ) => {
        try {
          if (!payload.conversationId) return;

          await chatServices.markAsRead(payload.conversationId, userId);

          // Inform the other user that their sent messages were seen
          if (payload.receiverId) {
            io?.to(`user:${payload.receiverId}`).emit('message:seen', {
              conversationId: payload.conversationId,
              seenBy: userId,
              seenAt: new Date(),
            });
          }

          if (callback) callback({ success: true });
        } catch (error: any) {
          if (callback) callback({ success: false, error: error.message });
        }
      },
    );

    // 4. Edit Message Event
    socket.on(
      'message:edit',
      async (
        payload: { messageId: string; text: string },
        callback?: (res: any) => void,
      ) => {
        try {
          if (!payload.messageId || !payload.text?.trim()) {
            if (callback) callback({ success: false, error: 'Invalid edit payload' });
            return;
          }

          const updated = await chatServices.editMessage(userId, payload.messageId, payload.text);

          io?.to(`user:${updated.receiverId}`).emit('message:updated', updated);
          socket.emit('message:updated', updated);

          const convUpdatePayload = {
            conversationId: updated.conversationId,
            lastMessageText: updated.text,
            lastMessageAt: updated.updatedAt,
            senderId: userId,
          };
          io?.to(`user:${updated.receiverId}`).emit('conversation:updated', convUpdatePayload);
          socket.emit('conversation:updated', convUpdatePayload);

          if (callback) callback({ success: true, data: updated });
        } catch (error: any) {
          if (callback) callback({ success: false, error: error.message });
        }
      },
    );

    // 5. Delete Message Event
    socket.on(
      'message:delete',
      async (
        payload: { messageId: string },
        callback?: (res: any) => void,
      ) => {
        try {
          if (!payload.messageId) {
            if (callback) callback({ success: false, error: 'Message ID is required' });
            return;
          }

          const deleted = await chatServices.deleteMessage(userId, payload.messageId);

          io?.to(`user:${deleted.receiverId}`).emit('message:deleted', deleted);
          socket.emit('message:deleted', deleted);

          const convDeletePayload = {
            conversationId: deleted.conversationId,
            lastMessageText: deleted.text,
            lastMessageAt: deleted.updatedAt,
            senderId: userId,
          };
          io?.to(`user:${deleted.receiverId}`).emit('conversation:updated', convDeletePayload);
          socket.emit('conversation:updated', convDeletePayload);

          if (callback) callback({ success: true, data: deleted });
        } catch (error: any) {
          if (callback) callback({ success: false, error: error.message });
        }
      },
    );

    // Handle Disconnect
    socket.on('disconnect', () => {
      const activeCount = onlineUsers.get(userId) || 1;
      if (activeCount <= 1) {
        onlineUsers.delete(userId);
        // Broadcast offline status
        socket.broadcast.emit('user:status', {
          userId,
          status: 'offline',
          lastSeen: new Date(),
        });
      } else {
        onlineUsers.set(userId, activeCount - 1);
      }
    });
  });

  return io;
};

export const getIO = (): SocketIOServer => {
  if (!io) {
    throw new Error('Socket.io has not been initialized!');
  }
  return io;
};
