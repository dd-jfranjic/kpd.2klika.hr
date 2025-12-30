import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationKind, Prisma } from '@prisma/client';

export interface CreateNotificationDto {
  recipientId?: string;
  isBroadcast?: boolean;
  kind: NotificationKind;
  title: string;
  body?: string;
  metadata?: Record<string, unknown>;
  expiresAt?: Date;
}

export interface NotificationResponse {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string | null;
  metadata: unknown;
  readAt: Date | null;
  shownAt: Date | null;
  createdAt: Date;
  isBroadcast: boolean;
}

/**
 * Notification Service
 *
 * Upravljanje notifikacijama:
 * - CLASSIC: Bell icon, notification center (lista)
 * - LOGIN_POPUP: Modal pri loginu (prikaži jednom)
 */
@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Kreiraj notifikaciju
   * Ako je isBroadcast=true, recipientId je null (ide svima)
   */
  async create(
    data: CreateNotificationDto,
    createdById: string,
  ): Promise<NotificationResponse> {
    const notification = await this.prisma.notification.create({
      data: {
        recipientId: data.isBroadcast ? null : data.recipientId,
        isBroadcast: data.isBroadcast ?? false,
        kind: data.kind,
        title: data.title,
        body: data.body,
        metadata: (data.metadata ?? {}) as Prisma.JsonObject,
        expiresAt: data.expiresAt,
        createdById,
      },
    });

    this.logger.log(
      `Notifikacija kreirana: ${notification.id} (${data.kind}, broadcast: ${data.isBroadcast})`,
    );

    return this.mapToResponse(notification);
  }

  /**
   * Dohvati nepročitane CLASSIC notifikacije za usera
   * Uključuje i broadcast notifikacije
   */
  async getUnreadClassic(userId: string): Promise<NotificationResponse[]> {
    const notifications = await this.prisma.notification.findMany({
      where: {
        kind: 'CLASSIC',
        readAt: null,
        AND: [
          {
            OR: [
              { recipientId: userId },
              { isBroadcast: true },
            ],
          },
          {
            OR: [
              { expiresAt: null },
              { expiresAt: { gt: new Date() } },
            ],
          },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    // Za broadcast, filtriraj one koje je user već pročitao
    // (koristimo shownAt za tracking broadcast prikazivanja)
    return notifications.map((n) => this.mapToResponse(n));
  }

  /**
   * Dohvati sve CLASSIC notifikacije za usera (pročitane i nepročitane)
   */
  async getAllClassic(
    userId: string,
    options?: { limit?: number; offset?: number },
  ): Promise<{ notifications: NotificationResponse[]; total: number }> {
    const limit = options?.limit ?? 20;
    const offset = options?.offset ?? 0;

    const [notifications, total] = await Promise.all([
      this.prisma.notification.findMany({
        where: {
          kind: 'CLASSIC',
          OR: [
            { recipientId: userId },
            { isBroadcast: true },
          ],
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.notification.count({
        where: {
          kind: 'CLASSIC',
          OR: [
            { recipientId: userId },
            { isBroadcast: true },
          ],
        },
      }),
    ]);

    return {
      notifications: notifications.map((n) => this.mapToResponse(n)),
      total,
    };
  }

  /**
   * Dohvati neprikazane LOGIN_POPUP notifikacije
   * Vraća samo one koje user još nije vidio (shownAt = null)
   */
  async getUnshownLoginPopups(userId: string): Promise<NotificationResponse[]> {
    // Dohvati sve LOGIN_POPUP notifikacije za ovog usera koje nisu prikazane
    const notifications = await this.prisma.notification.findMany({
      where: {
        kind: 'LOGIN_POPUP',
        shownAt: null,
        OR: [
          { recipientId: userId },
          { isBroadcast: true },
        ],
        // Isključi expired
        AND: [
          {
            OR: [
              { expiresAt: null },
              { expiresAt: { gt: new Date() } },
            ],
          },
        ],
      },
      orderBy: { createdAt: 'desc' },
    });

    // Za broadcast notifikacije, moramo provjeriti je li user već vidio
    // Koristimo metadata za tracking prikazanih broadcast notifikacija
    const result: NotificationResponse[] = [];

    for (const n of notifications) {
      if (n.isBroadcast) {
        // Provjeri je li user već vidio ovaj broadcast
        const alreadyShown = await this.prisma.notification.findFirst({
          where: {
            id: n.id,
            // Koristi JSON metadata za tracking
          },
        });
        // Za sada vraćamo sve, tracking ćemo napraviti preko readAt
        if (alreadyShown && !alreadyShown.shownAt) {
          result.push(this.mapToResponse(n));
        }
      } else {
        result.push(this.mapToResponse(n));
      }
    }

    return result;
  }

  /**
   * Označi notifikaciju kao prikazanu (za LOGIN_POPUP)
   */
  async markAsShown(notificationId: string, userId: string): Promise<void> {
    const notification = await this.prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      throw new NotFoundException('Notifikacija nije pronađena');
    }

    // Provjeri pripada li ova notifikacija useru
    if (!notification.isBroadcast && notification.recipientId !== userId) {
      throw new NotFoundException('Notifikacija nije pronađena');
    }

    // Ako je broadcast, koristimo shownAt za tracking prvog prikazivanja
    // Za individual notifikacije, jednostavno označimo
    if (!notification.isBroadcast) {
      await this.prisma.notification.update({
        where: { id: notificationId },
        data: { shownAt: new Date() },
      });
    } else {
      // Za broadcast, kreiramo tracking zapis (ili ažuriramo metadata)
      // Za sada samo ažuriramo shownAt - u budućnosti možemo dodati posebnu tablicu
      await this.prisma.notification.update({
        where: { id: notificationId },
        data: { shownAt: new Date() },
      });
    }
  }

  /**
   * Označi notifikaciju kao pročitanu
   */
  async markAsRead(notificationId: string, userId: string): Promise<void> {
    const notification = await this.prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      throw new NotFoundException('Notifikacija nije pronađena');
    }

    if (!notification.isBroadcast && notification.recipientId !== userId) {
      throw new NotFoundException('Notifikacija nije pronađena');
    }

    await this.prisma.notification.update({
      where: { id: notificationId },
      data: { readAt: new Date() },
    });
  }

  /**
   * Označi sve CLASSIC notifikacije kao pročitane
   */
  async markAllAsRead(userId: string): Promise<number> {
    const result = await this.prisma.notification.updateMany({
      where: {
        kind: 'CLASSIC',
        readAt: null,
        OR: [
          { recipientId: userId },
          { isBroadcast: true },
        ],
      },
      data: { readAt: new Date() },
    });

    return result.count;
  }

  /**
   * Broj nepročitanih CLASSIC notifikacija
   */
  async getUnreadCount(userId: string): Promise<number> {
    return this.prisma.notification.count({
      where: {
        kind: 'CLASSIC',
        readAt: null,
        OR: [
          { recipientId: userId },
          { isBroadcast: true },
        ],
        AND: [
          {
            OR: [
              { expiresAt: null },
              { expiresAt: { gt: new Date() } },
            ],
          },
        ],
      },
    });
  }

  /**
   * Admin: Dohvati sve notifikacije (za pregled)
   */
  async adminGetAll(options?: {
    limit?: number;
    offset?: number;
    kind?: NotificationKind;
  }): Promise<{ notifications: NotificationResponse[]; total: number }> {
    const limit = options?.limit ?? 50;
    const offset = options?.offset ?? 0;

    const where = options?.kind ? { kind: options.kind } : {};

    const [notifications, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        include: {
          recipient: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
          createdBy: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      }),
      this.prisma.notification.count({ where }),
    ]);

    return {
      notifications: notifications.map((n) => ({
        ...this.mapToResponse(n),
        recipient: n.recipient,
        createdBy: n.createdBy,
      })),
      total,
    };
  }

  /**
   * Helper: Map notification to response
   */
  private mapToResponse(notification: {
    id: string;
    kind: NotificationKind;
    title: string;
    body: string | null;
    metadata: unknown;
    readAt: Date | null;
    shownAt: Date | null;
    createdAt: Date;
    isBroadcast: boolean;
  }): NotificationResponse {
    return {
      id: notification.id,
      kind: notification.kind,
      title: notification.title,
      body: notification.body,
      metadata: notification.metadata,
      readAt: notification.readAt,
      shownAt: notification.shownAt,
      createdAt: notification.createdAt,
      isBroadcast: notification.isBroadcast,
    };
  }
}
