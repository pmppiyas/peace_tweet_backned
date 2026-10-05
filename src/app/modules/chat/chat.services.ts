import { prisma } from '../../config/prisma';
import { IMessageQuery, ISendMessageInput } from './chat.interface';

/**
 * Get or create a 1-to-1 conversation between two users
 */
const userSelect = {
  id: true,
  name: true,
  username: true,
  avatarUrl: true,
};

const getOrCreateConversation = async (userAId: string, userBId: string) => {
  if (userAId === userBId) {
    throw new Error('Cannot start a conversation with yourself.');
  }

  // Canonical ordering to guarantee exactly 1 unique conversation per pair
  const [participantOneId, participantTwoId] = [userAId, userBId].sort();

  let conversation = await prisma.conversation.findUnique({
    where: {
      participantOneId_participantTwoId: {
        participantOneId,
        participantTwoId,
      },
    },
    include: {
      participantOne: { select: userSelect },
      participantTwo: { select: userSelect },
    },
  });

  if (!conversation) {
    try {
      conversation = await prisma.conversation.create({
        data: {
          participantOneId,
          participantTwoId,
        },
        include: {
          participantOne: { select: userSelect },
          participantTwo: { select: userSelect },
        },
      });
    } catch (err) {
      // Handle concurrent creation race condition gracefully
      conversation = await prisma.conversation.findUnique({
        where: {
          participantOneId_participantTwoId: {
            participantOneId,
            participantTwoId,
          },
        },
        include: {
          participantOne: { select: userSelect },
          participantTwo: { select: userSelect },
        },
      });
      if (!conversation) throw err;
    }
  }

  const otherUser =
    conversation.participantOneId === userAId
      ? conversation.participantTwo
      : conversation.participantOne;

  const unreadCount = await prisma.message.count({
    where: {
      conversationId: conversation.id,
      senderId: { not: userAId },
      isRead: false,
    },
  });

  return {
    id: conversation.id,
    participantOneId: conversation.participantOneId,
    participantTwoId: conversation.participantTwoId,
    lastMessageText: conversation.lastMessageText,
    lastMessageAt: conversation.lastMessageAt,
    createdAt: conversation.createdAt,
    updatedAt: conversation.updatedAt,
    otherUser,
    participant: otherUser,
    unreadCount,
  };
};

/**
 * Get all conversations for a user (Inbox listing)
 */
const getConversations = async (userId: string) => {
  const conversations = await prisma.conversation.findMany({
    where: {
      OR: [
        { participantOneId: userId },
        { participantTwoId: userId },
      ],
    },
    orderBy: {
      lastMessageAt: 'desc',
    },
    include: {
      participantOne: {
        select: {
          id: true,
          name: true,
          username: true,
          avatarUrl: true,
        },
      },
      participantTwo: {
        select: {
          id: true,
          name: true,
          username: true,
          avatarUrl: true,
        },
      },
      messages: {
        where: {
          senderId: { not: userId },
          isRead: false,
        },
        select: {
          id: true,
        },
      },
    },
  });

  return conversations.map((conv) => {
    // The other person in this conversation
    const otherParticipant =
      conv.participantOneId === userId ? conv.participantTwo : conv.participantOne;
    const unreadCount = conv.messages.length;

    return {
      id: conv.id,
      participantOneId: conv.participantOneId,
      participantTwoId: conv.participantTwoId,
      otherUser: otherParticipant,
      participant: otherParticipant,
      lastMessageText: conv.lastMessageText,
      lastMessageAt: conv.lastMessageAt,
      unreadCount,
      createdAt: conv.createdAt,
      updatedAt: conv.updatedAt,
    };
  });
};

/**
 * Get paginated message history for a conversation
 */
const getMessages = async (
  conversationId: string,
  userId: string,
  query: IMessageQuery,
) => {
  // Ensure user belongs to this conversation
  const conversation = await prisma.conversation.findFirst({
    where: {
      id: conversationId,
      OR: [
        { participantOneId: userId },
        { participantTwoId: userId },
      ],
    },
  });

  if (!conversation) {
    throw new Error('Conversation not found or access denied.');
  }

  const limit = Math.max(1, Math.min(50, Number(query.limit) || 20));
  const cursor = query.cursor;

  const messages = await prisma.message.findMany({
    where: { conversationId },
    take: limit + 1,
    skip: cursor ? 1 : 0,
    cursor: cursor ? { id: cursor } : undefined,
    orderBy: { createdAt: 'desc' },
    include: {
      sender: {
        select: {
          id: true,
          name: true,
          username: true,
          avatarUrl: true,
        },
      },
    },
  });

  let nextCursor: string | null = null;
  if (messages.length > limit) {
    const nextItem = messages.pop();
    nextCursor = nextItem ? nextItem.id : null;
  }

  // Return chronologically for ease of client UI rendering (oldest -> newest in chat window)
  const reversed = messages.reverse();
  return {
    messages: reversed,
    items: reversed,
    nextCursor,
  };
};

/**
 * Save a new message and update the conversation
 */
const saveMessage = async (
  senderId: string,
  payload: ISendMessageInput,
) => {
  const { receiverId, text, conversationId } = payload;

  if (senderId === receiverId) {
    throw new Error('Cannot send a message to yourself.');
  }

  let activeConversationId = conversationId;

  if (!activeConversationId) {
    const conversation = await getOrCreateConversation(senderId, receiverId);
    activeConversationId = conversation.id;
  } else {
    // Validate conversation
    const existing = await prisma.conversation.findFirst({
      where: {
        id: activeConversationId,
        OR: [{ participantOneId: senderId }, { participantTwoId: senderId }],
      },
    });
    if (!existing) {
      const conversation = await getOrCreateConversation(senderId, receiverId);
      activeConversationId = conversation.id;
    }
  }

  // Atomically create message and update conversation's last message snippet
  const [createdMessage] = await prisma.$transaction([
    prisma.message.create({
      data: {
        conversationId: activeConversationId,
        senderId,
        text: text.trim(),
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            username: true,
            avatarUrl: true,
          },
        },
      },
    }),
    prisma.conversation.update({
      where: { id: activeConversationId },
      data: {
        lastMessageText: text.trim(),
        lastMessageAt: new Date(),
      },
    }),
  ]);

  return {
    ...createdMessage,
    receiverId,
  };
};

/**
 * Mark messages in a conversation as read
 */
const markAsRead = async (conversationId: string, userId: string) => {
  await prisma.message.updateMany({
    where: {
      conversationId,
      senderId: { not: userId },
      isRead: false,
    },
    data: {
      isRead: true,
      readAt: new Date(),
    },
  });

  return { success: true };
};

/**
 * Edit an existing message
 */
const editMessage = async (userId: string, messageId: string, text: string) => {
  const message = await prisma.message.findUnique({
    where: { id: messageId },
    include: {
      conversation: true,
      sender: {
        select: {
          id: true,
          name: true,
          username: true,
          avatarUrl: true,
        },
      },
    },
  });

  if (!message) {
    throw new Error('Message not found.');
  }

  if (message.senderId !== userId) {
    throw new Error('You can only edit your own messages.');
  }

  if (message.isDeleted) {
    throw new Error('Cannot edit a deleted message.');
  }

  const updatedMessage = await prisma.message.update({
    where: { id: messageId },
    data: {
      text: text.trim(),
      isEdited: true,
      updatedAt: new Date(),
    },
    include: {
      sender: {
        select: {
          id: true,
          name: true,
          username: true,
          avatarUrl: true,
        },
      },
    },
  });

  const receiverId =
    message.conversation.participantOneId === userId
      ? message.conversation.participantTwoId
      : message.conversation.participantOneId;

  // If this was the last message, update the conversation's snippet
  const latestMessage = await prisma.message.findFirst({
    where: { conversationId: message.conversationId },
    orderBy: { createdAt: 'desc' },
  });

  if (latestMessage?.id === messageId) {
    await prisma.conversation.update({
      where: { id: message.conversationId },
      data: { lastMessageText: text.trim() },
    });
  }

  return {
    ...updatedMessage,
    receiverId,
  };
};

/**
 * Delete / Unsend a message
 */
const deleteMessage = async (userId: string, messageId: string) => {
  const message = await prisma.message.findUnique({
    where: { id: messageId },
    include: {
      conversation: true,
      sender: {
        select: {
          id: true,
          name: true,
          username: true,
          avatarUrl: true,
        },
      },
    },
  });

  if (!message) {
    throw new Error('Message not found.');
  }

  if (message.senderId !== userId) {
    throw new Error('You can only delete your own messages.');
  }

  const deletedPlaceholder = 'মেসেজটি মুছে ফেলা হয়েছে';

  const updatedMessage = await prisma.message.update({
    where: { id: messageId },
    data: {
      text: deletedPlaceholder,
      isDeleted: true,
      updatedAt: new Date(),
    },
    include: {
      sender: {
        select: {
          id: true,
          name: true,
          username: true,
          avatarUrl: true,
        },
      },
    },
  });

  const receiverId =
    message.conversation.participantOneId === userId
      ? message.conversation.participantTwoId
      : message.conversation.participantOneId;

  // If this was the last message, update snippet
  const latestMessage = await prisma.message.findFirst({
    where: { conversationId: message.conversationId },
    orderBy: { createdAt: 'desc' },
  });

  if (latestMessage?.id === messageId) {
    await prisma.conversation.update({
      where: { id: message.conversationId },
      data: { lastMessageText: deletedPlaceholder },
    });
  }

  return {
    ...updatedMessage,
    receiverId,
  };
};

export const chatServices = {
  getOrCreateConversation,
  getConversations,
  getMessages,
  saveMessage,
  markAsRead,
  editMessage,
  deleteMessage,
};
