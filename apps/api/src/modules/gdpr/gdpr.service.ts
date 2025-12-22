import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ConsentType, GdprRequestType, GdprRequestStatus } from '@prisma/client';
import {
  UpdateCookieConsentDto,
  UpdateConsentDto,
  RequestDataExportDto,
  RequestDataDeletionDto,
  ProcessGdprRequestDto,
  ListGdprRequestsQueryDto,
} from './dto';

@Injectable()
export class GdprService {
  constructor(private readonly prisma: PrismaService) {}

  // ===========================================
  // USER CONSENT MANAGEMENT
  // ===========================================

  /**
   * Record multiple consents during registration
   * Called from AuthService.register()
   */
  async recordRegistrationConsents(
    userId: string,
    consents: { termsOfService: boolean; privacyPolicy: boolean; marketingEmails?: boolean },
    metadata: { ipAddress?: string; userAgent?: string },
  ) {
    const consentRecords = [];

    // Terms of Service - required
    if (consents.termsOfService) {
      consentRecords.push({
        userId,
        consentType: ConsentType.TERMS_OF_SERVICE,
        granted: true,
        version: '1.0',
        ipAddress: metadata.ipAddress,
        userAgent: metadata.userAgent,
      });
    }

    // Privacy Policy - required
    if (consents.privacyPolicy) {
      consentRecords.push({
        userId,
        consentType: ConsentType.PRIVACY_POLICY,
        granted: true,
        version: '1.0',
        ipAddress: metadata.ipAddress,
        userAgent: metadata.userAgent,
      });
    }

    // Marketing Emails - optional
    if (consents.marketingEmails !== undefined) {
      consentRecords.push({
        userId,
        consentType: ConsentType.MARKETING_EMAILS,
        granted: consents.marketingEmails,
        version: '1.0',
        ipAddress: metadata.ipAddress,
        userAgent: metadata.userAgent,
      });
    }

    // Batch create all consents
    await this.prisma.userConsent.createMany({
      data: consentRecords,
    });

    return consentRecords.length;
  }

  /**
   * Get all consents for a user
   */
  async getUserConsents(userId: string) {
    return this.prisma.userConsent.findMany({
      where: { userId },
      orderBy: { grantedAt: 'desc' },
    });
  }

  /**
   * Update a specific consent (e.g., marketing emails)
   */
  async updateConsent(
    userId: string,
    dto: UpdateConsentDto,
    metadata: { ipAddress?: string; userAgent?: string },
  ) {
    // Check if consent exists
    const existing = await this.prisma.userConsent.findFirst({
      where: {
        userId,
        consentType: dto.consentType,
        revokedAt: null,
      },
    });

    if (existing) {
      // Revoke existing consent
      await this.prisma.userConsent.update({
        where: { id: existing.id },
        data: { revokedAt: new Date() },
      });
    }

    // Create new consent record (for audit trail)
    return this.prisma.userConsent.create({
      data: {
        userId,
        consentType: dto.consentType,
        granted: dto.granted,
        version: '1.0',
        ipAddress: metadata.ipAddress,
        userAgent: metadata.userAgent,
      },
    });
  }

  // ===========================================
  // COOKIE CONSENT (Public, no auth required)
  // ===========================================

  /**
   * Get or create cookie consent for a visitor
   */
  async getCookieConsent(visitorId: string) {
    const consent = await this.prisma.cookieConsent.findUnique({
      where: { visitorId },
    });

    if (!consent) {
      // Return default values without creating record yet
      return {
        visitorId,
        necessary: true,
        analytics: false,
        marketing: false,
        exists: false,
      };
    }

    return { ...consent, exists: true };
  }

  /**
   * Update cookie consent for a visitor
   */
  async updateCookieConsent(
    dto: UpdateCookieConsentDto,
    metadata: { ipAddress?: string; userAgent?: string },
  ) {
    return this.prisma.cookieConsent.upsert({
      where: { visitorId: dto.visitorId },
      create: {
        visitorId: dto.visitorId,
        necessary: true, // Always true
        analytics: dto.analytics ?? false,
        marketing: dto.marketing ?? false,
        ipAddress: metadata.ipAddress,
        userAgent: metadata.userAgent,
      },
      update: {
        analytics: dto.analytics,
        marketing: dto.marketing,
        ipAddress: metadata.ipAddress,
        userAgent: metadata.userAgent,
      },
    });
  }

  /**
   * Link cookie consent to user after login
   */
  async linkCookieConsentToUser(visitorId: string, userId: string) {
    // Check if user already has linked consent
    const existingUserConsent = await this.prisma.cookieConsent.findUnique({
      where: { userId },
    });

    if (existingUserConsent) {
      // User already has consent, just delete the visitor one
      await this.prisma.cookieConsent.deleteMany({
        where: { visitorId, userId: null },
      });
      return existingUserConsent;
    }

    // Try to link visitor consent to user
    const visitorConsent = await this.prisma.cookieConsent.findUnique({
      where: { visitorId },
    });

    if (visitorConsent && !visitorConsent.userId) {
      return this.prisma.cookieConsent.update({
        where: { visitorId },
        data: { userId },
      });
    }

    return visitorConsent;
  }

  // ===========================================
  // GDPR DATA REQUESTS
  // ===========================================

  /**
   * Create data export request (Article 15)
   */
  async requestDataExport(userId: string, dto: RequestDataExportDto) {
    // Check if there's already a pending request
    const pendingRequest = await this.prisma.gdprRequest.findFirst({
      where: {
        userId,
        requestType: GdprRequestType.DATA_EXPORT,
        status: { in: [GdprRequestStatus.PENDING, GdprRequestStatus.PROCESSING] },
      },
    });

    if (pendingRequest) {
      throw new BadRequestException('You already have a pending data export request');
    }

    return this.prisma.gdprRequest.create({
      data: {
        userId,
        requestType: GdprRequestType.DATA_EXPORT,
        notes: dto.notes,
      },
    });
  }

  /**
   * Create data deletion request (Article 17)
   */
  async requestDataDeletion(userId: string, dto: RequestDataDeletionDto) {
    // Check if there's already a pending request
    const pendingRequest = await this.prisma.gdprRequest.findFirst({
      where: {
        userId,
        requestType: GdprRequestType.DATA_DELETION,
        status: { in: [GdprRequestStatus.PENDING, GdprRequestStatus.PROCESSING] },
      },
    });

    if (pendingRequest) {
      throw new BadRequestException('You already have a pending deletion request');
    }

    // Mark user for deletion (but don't delete yet)
    await this.prisma.user.update({
      where: { id: userId },
      data: { deletionRequestedAt: new Date() },
    });

    return this.prisma.gdprRequest.create({
      data: {
        userId,
        requestType: GdprRequestType.DATA_DELETION,
        reason: dto.reason,
      },
    });
  }

  /**
   * Get user's GDPR requests
   */
  async getUserGdprRequests(userId: string) {
    return this.prisma.gdprRequest.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Cancel a pending GDPR request
   */
  async cancelGdprRequest(userId: string, requestId: string) {
    const request = await this.prisma.gdprRequest.findFirst({
      where: {
        id: requestId,
        userId,
        status: GdprRequestStatus.PENDING,
      },
    });

    if (!request) {
      throw new NotFoundException('Request not found or cannot be cancelled');
    }

    // If it was a deletion request, clear the deletionRequestedAt
    if (request.requestType === GdprRequestType.DATA_DELETION) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { deletionRequestedAt: null },
      });
    }

    return this.prisma.gdprRequest.update({
      where: { id: requestId },
      data: { status: GdprRequestStatus.CANCELLED },
    });
  }

  // ===========================================
  // ADMIN: GDPR REQUEST MANAGEMENT
  // ===========================================

  /**
   * List all GDPR requests (admin)
   */
  async listGdprRequests(query: ListGdprRequestsQueryDto) {
    const { requestType, status, userId, page = 1, limit = 20 } = query;

    const where: any = {};
    if (requestType) where.requestType = requestType;
    if (status) where.status = status;
    if (userId) where.userId = userId;

    const [requests, total] = await Promise.all([
      this.prisma.gdprRequest.findMany({
        where,
        include: {
          user: {
            select: { id: true, email: true, firstName: true, lastName: true },
          },
          processedBy: {
            select: { id: true, email: true, firstName: true, lastName: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.gdprRequest.count({ where }),
    ]);

    return {
      data: requests,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Process a GDPR request (admin)
   */
  async processGdprRequest(
    requestId: string,
    adminId: string,
    dto: ProcessGdprRequestDto,
  ) {
    const request = await this.prisma.gdprRequest.findUnique({
      where: { id: requestId },
      include: { user: true },
    });

    if (!request) {
      throw new NotFoundException('Request not found');
    }

    // Calculate export expiry (24 hours)
    const exportExpiresAt = dto.exportUrl
      ? new Date(Date.now() + 24 * 60 * 60 * 1000)
      : undefined;

    // Update request
    const updated = await this.prisma.gdprRequest.update({
      where: { id: requestId },
      data: {
        status: dto.status,
        notes: dto.notes,
        exportUrl: dto.exportUrl,
        exportExpiresAt,
        processedById: adminId,
        processedAt: new Date(),
      },
    });

    // If deletion completed, actually delete user data
    if (
      request.requestType === GdprRequestType.DATA_DELETION &&
      dto.status === GdprRequestStatus.COMPLETED
    ) {
      await this.deleteUserData(request.userId);
    }

    // If export completed, update user's last export timestamp
    if (
      request.requestType === GdprRequestType.DATA_EXPORT &&
      dto.status === GdprRequestStatus.COMPLETED
    ) {
      await this.prisma.user.update({
        where: { id: request.userId },
        data: { dataExportedAt: new Date() },
      });
    }

    return updated;
  }

  /**
   * Generate user data export (for admin to create ZIP/JSON)
   */
  async generateUserDataExport(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        memberships: {
          include: { organization: { select: { id: true, name: true, slug: true } } },
        },
        consents: true,
        sentInvitations: true,
        auditLogs: { take: 100, orderBy: { createdAt: 'desc' } },
        gdprRequests: true,
        cookieConsent: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Get user's queries
    const queries = await this.prisma.query.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 1000,
    });

    // Remove sensitive fields
    const { passwordHash, ...userData } = user;

    return {
      exportDate: new Date().toISOString(),
      user: userData,
      queries,
    };
  }

  /**
   * Delete all user data (GDPR Article 17)
   */
  private async deleteUserData(userId: string) {
    // Prisma cascades will handle most relations
    // But we need to anonymize data in some tables

    // Anonymize queries (keep for analytics but remove PII)
    await this.prisma.query.updateMany({
      where: { userId },
      data: {
        userId: null,
        ipAddress: null,
        userAgent: null,
      },
    });

    // Delete the user (cascades to memberships, consents, etc.)
    await this.prisma.user.delete({
      where: { id: userId },
    });
  }

  // ===========================================
  // ADMIN: CONSENT AUDIT
  // ===========================================

  /**
   * Get all user consents with filtering (admin)
   */
  async listAllConsents(query: {
    consentType?: ConsentType;
    granted?: boolean;
    userId?: string;
    page?: number;
    limit?: number;
  }) {
    const { consentType, granted, userId, page = 1, limit = 50 } = query;

    const where: any = {};
    if (consentType) where.consentType = consentType;
    if (granted !== undefined) where.granted = granted;
    if (userId) where.userId = userId;

    const [consents, total] = await Promise.all([
      this.prisma.userConsent.findMany({
        where,
        include: {
          user: {
            select: { id: true, email: true, firstName: true, lastName: true },
          },
        },
        orderBy: { grantedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.userConsent.count({ where }),
    ]);

    return {
      data: consents,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Export all consents to CSV (admin)
   */
  async exportConsentsToCSV() {
    const consents = await this.prisma.userConsent.findMany({
      include: {
        user: {
          select: { email: true, firstName: true, lastName: true },
        },
      },
      orderBy: { grantedAt: 'desc' },
    });

    const headers = [
      'ID',
      'User Email',
      'User Name',
      'Consent Type',
      'Granted',
      'Version',
      'Granted At',
      'Revoked At',
      'IP Address',
    ];

    const rows = consents.map((c: any) => [
      c.id,
      c.user.email,
      `${c.user.firstName || ''} ${c.user.lastName || ''}`.trim(),
      c.consentType,
      c.granted ? 'Yes' : 'No',
      c.version,
      c.grantedAt.toISOString(),
      c.revokedAt?.toISOString() || '',
      c.ipAddress || '',
    ]);

    return [headers, ...rows].map((row) => row.join(',')).join('\n');
  }
}
