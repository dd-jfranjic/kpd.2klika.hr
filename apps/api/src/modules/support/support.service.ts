import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ThreadStatus, SenderType, Prisma } from '@prisma/client';

export interface MessageDto {
  body: string;
}

export interface ThreadResponse {
  id: string;
  userId: string;
  status: ThreadStatus;
  lastMessageAt: Date | null;
  unreadByAdmin: number;
  unreadByUser: number;
  createdAt: Date;
  updatedAt: Date;
  user?: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
  };
  lastMessage?: {
    body: string;
    senderType: SenderType;
    createdAt: Date;
  };
}

export interface MessageResponse {
  id: string;
  threadId: string;
  senderType: SenderType;
  senderId: string;
  body: string;
  readAt: Date | null;
  createdAt: Date;
}

/**
 * Support Service
 *
 * WhatsApp-style chat sustav:
 * - Jedan thread po korisniku
 * - User šalje poruke, Admin odgovara
 * - Notifikacije pri novim porukama
 */
@Injectable()
export class SupportService {
  private readonly logger = new Logger(SupportService.name);

  constructor(private readonly prisma: PrismaService) {}

  // =====================================
  // USER METHODS
  // =====================================

  /**
   * Dohvati ili kreiraj thread za korisnika
   */
  async getOrCreateThread(userId: string): Promise<ThreadResponse> {
    let thread = await this.prisma.supportThread.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!thread) {
      thread = await this.prisma.supportThread.create({
        data: {
          userId,
          status: 'OPEN',
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      });
      this.logger.log(`Novi support thread kreiran za user: ${userId}`);
    }

    return this.mapThreadToResponse(thread);
  }

  /**
   * Dohvati poruke za korisnikov thread
   */
  async getUserMessages(
    userId: string,
    options?: { limit?: number; before?: string },
  ): Promise<{ messages: MessageResponse[]; hasMore: boolean }> {
    const thread = await this.prisma.supportThread.findUnique({
      where: { userId },
    });

    if (!thread) {
      return { messages: [], hasMore: false };
    }

    const limit = options?.limit ?? 50;
    const where: Prisma.SupportMessageWhereInput = { threadId: thread.id };

    if (options?.before) {
      const beforeMessage = await this.prisma.supportMessage.findUnique({
        where: { id: options.before },
      });
      if (beforeMessage) {
        where.createdAt = { lt: beforeMessage.createdAt };
      }
    }

    const messages = await this.prisma.supportMessage.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
    });

    const hasMore = messages.length > limit;
    if (hasMore) messages.pop();

    // Mark admin messages as read
    await this.prisma.supportMessage.updateMany({
      where: {
        threadId: thread.id,
        senderType: 'ADMIN',
        readAt: null,
      },
      data: { readAt: new Date() },
    });

    // Reset unread counter for user
    await this.prisma.supportThread.update({
      where: { id: thread.id },
      data: { unreadByUser: 0 },
    });

    return {
      messages: messages.reverse().map(this.mapMessageToResponse),
      hasMore,
    };
  }

  /**
   * User šalje poruku
   */
  async sendUserMessage(
    userId: string,
    data: MessageDto,
  ): Promise<MessageResponse> {
    // Get or create thread
    const thread = await this.getOrCreateThread(userId);

    // Create message
    const message = await this.prisma.supportMessage.create({
      data: {
        threadId: thread.id,
        senderType: 'USER',
        senderId: userId,
        body: data.body.trim(),
      },
    });

    // Update thread
    await this.prisma.supportThread.update({
      where: { id: thread.id },
      data: {
        lastMessageAt: new Date(),
        unreadByAdmin: { increment: 1 },
        status: 'OPEN', // Reopen if was closed
      },
    });

    this.logger.log(`User ${userId} poslao poruku u thread ${thread.id}`);

    return this.mapMessageToResponse(message);
  }

  /**
   * Broj nepročitanih poruka za usera
   */
  async getUserUnreadCount(userId: string): Promise<number> {
    const thread = await this.prisma.supportThread.findUnique({
      where: { userId },
      select: { unreadByUser: true },
    });
    return thread?.unreadByUser ?? 0;
  }

  // =====================================
  // ADMIN METHODS
  // =====================================

  /**
   * Dohvati sve threadove (inbox)
   */
  async getAdminInbox(options?: {
    status?: ThreadStatus;
    limit?: number;
    offset?: number;
  }): Promise<{ threads: ThreadResponse[]; total: number }> {
    const limit = options?.limit ?? 20;
    const offset = options?.offset ?? 0;
    const where: Prisma.SupportThreadWhereInput = {};

    if (options?.status) {
      where.status = options.status;
    }

    const [threads, total] = await Promise.all([
      this.prisma.supportThread.findMany({
        where,
        orderBy: [
          { unreadByAdmin: 'desc' },
          { lastMessageAt: 'desc' },
        ],
        take: limit,
        skip: offset,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      }),
      this.prisma.supportThread.count({ where }),
    ]);

    return {
      threads: threads.map(this.mapThreadToResponse),
      total,
    };
  }

  /**
   * Dohvati thread po ID-u (admin)
   */
  async getAdminThread(threadId: string): Promise<ThreadResponse> {
    const thread = await this.prisma.supportThread.findUnique({
      where: { id: threadId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!thread) {
      throw new NotFoundException('Thread nije pronađen');
    }

    return this.mapThreadToResponse(thread);
  }

  /**
   * Dohvati poruke threada (admin)
   */
  async getAdminThreadMessages(
    threadId: string,
    options?: { limit?: number; before?: string },
  ): Promise<{ messages: MessageResponse[]; hasMore: boolean }> {
    const thread = await this.prisma.supportThread.findUnique({
      where: { id: threadId },
    });

    if (!thread) {
      throw new NotFoundException('Thread nije pronađen');
    }

    const limit = options?.limit ?? 50;
    const where: Prisma.SupportMessageWhereInput = { threadId };

    if (options?.before) {
      const beforeMessage = await this.prisma.supportMessage.findUnique({
        where: { id: options.before },
      });
      if (beforeMessage) {
        where.createdAt = { lt: beforeMessage.createdAt };
      }
    }

    const messages = await this.prisma.supportMessage.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
    });

    const hasMore = messages.length > limit;
    if (hasMore) messages.pop();

    // Mark user messages as read
    await this.prisma.supportMessage.updateMany({
      where: {
        threadId,
        senderType: 'USER',
        readAt: null,
      },
      data: { readAt: new Date() },
    });

    // Reset unread counter for admin
    await this.prisma.supportThread.update({
      where: { id: threadId },
      data: { unreadByAdmin: 0 },
    });

    return {
      messages: messages.reverse().map(this.mapMessageToResponse),
      hasMore,
    };
  }

  /**
   * Admin šalje poruku
   */
  async sendAdminMessage(
    threadId: string,
    adminId: string,
    data: MessageDto,
  ): Promise<MessageResponse> {
    const thread = await this.prisma.supportThread.findUnique({
      where: { id: threadId },
    });

    if (!thread) {
      throw new NotFoundException('Thread nije pronađen');
    }

    // Create message
    const message = await this.prisma.supportMessage.create({
      data: {
        threadId,
        senderType: 'ADMIN',
        senderId: adminId,
        body: data.body.trim(),
      },
    });

    // Update thread
    await this.prisma.supportThread.update({
      where: { id: threadId },
      data: {
        lastMessageAt: new Date(),
        unreadByUser: { increment: 1 },
      },
    });

    // Create notification for user
    await this.prisma.notification.create({
      data: {
        recipientId: thread.userId,
        kind: 'CLASSIC',
        title: 'Nova poruka od podrške',
        body: data.body.length > 100 ? data.body.substring(0, 100) + '...' : data.body,
        metadata: {
          type: 'SUPPORT_MESSAGE',
          threadId,
          messageId: message.id,
        } as Prisma.JsonObject,
        createdById: adminId,
      },
    });

    this.logger.log(`Admin ${adminId} odgovorio u thread ${threadId}`);

    return this.mapMessageToResponse(message);
  }

  /**
   * Promijeni status threada
   */
  async updateThreadStatus(
    threadId: string,
    status: ThreadStatus,
  ): Promise<ThreadResponse> {
    const thread = await this.prisma.supportThread.update({
      where: { id: threadId },
      data: { status },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    return this.mapThreadToResponse(thread);
  }

  /**
   * Ukupno nepročitanih poruka za admine
   */
  async getAdminTotalUnread(): Promise<number> {
    const result = await this.prisma.supportThread.aggregate({
      _sum: { unreadByAdmin: true },
    });
    return result._sum.unreadByAdmin ?? 0;
  }

  // =====================================
  // HELPERS
  // =====================================

  private mapThreadToResponse(thread: {
    id: string;
    userId: string;
    status: ThreadStatus;
    lastMessageAt: Date | null;
    unreadByAdmin: number;
    unreadByUser: number;
    createdAt: Date;
    updatedAt: Date;
    user?: {
      id: string;
      email: string;
      firstName: string | null;
      lastName: string | null;
    };
    messages?: Array<{
      body: string;
      senderType: SenderType;
      createdAt: Date;
    }>;
  }): ThreadResponse {
    return {
      id: thread.id,
      userId: thread.userId,
      status: thread.status,
      lastMessageAt: thread.lastMessageAt,
      unreadByAdmin: thread.unreadByAdmin,
      unreadByUser: thread.unreadByUser,
      createdAt: thread.createdAt,
      updatedAt: thread.updatedAt,
      user: thread.user,
      lastMessage: thread.messages?.[0],
    };
  }

  private mapMessageToResponse(message: {
    id: string;
    threadId: string;
    senderType: SenderType;
    senderId: string;
    body: string;
    readAt: Date | null;
    createdAt: Date;
  }): MessageResponse {
    return {
      id: message.id,
      threadId: message.threadId,
      senderType: message.senderType,
      senderId: message.senderId,
      body: message.body,
      readAt: message.readAt,
      createdAt: message.createdAt,
    };
  }
}
