import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as crypto from 'crypto';

@Injectable()
export class ApiKeysService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generate a secure random API key
   */
  private generateApiKey(): string {
    const prefix = 'kpd_';
    const randomBytes = crypto.randomBytes(32).toString('hex');
    return `${prefix}${randomBytes}`;
  }

  /**
   * Hash an API key for storage
   */
  private hashApiKey(key: string): string {
    return crypto.createHash('sha256').update(key).digest('hex');
  }

  /**
   * Get the prefix of an API key (for identification)
   */
  private getKeyPrefix(key: string): string {
    return key.substring(0, 12); // "kpd_" + first 8 chars
  }

  /**
   * Get organization ID for user
   */
  private async getOrganizationId(userId: string): Promise<string> {
    const membership = await this.prisma.organizationMember.findFirst({
      where: { userId },
      select: { organizationId: true },
    });

    if (!membership) {
      throw new ForbiddenException('Korisnik nije član organizacije');
    }

    return membership.organizationId;
  }

  /**
   * List all API keys for a user's organization
   */
  async listApiKeys(userId: string) {
    const organizationId = await this.getOrganizationId(userId);

    const keys = await this.prisma.apiKey.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        scopes: true,
        isActive: true,
        lastUsedAt: true,
        usageCount: true,
        expiresAt: true,
        createdAt: true,
      },
    });

    return keys;
  }

  /**
   * Create a new API key
   * Returns the full key only once - it's not stored in plaintext
   */
  async createApiKey(userId: string, name: string, scopes: string[] = ['kpd:read', 'kpd:classify']) {
    const organizationId = await this.getOrganizationId(userId);

    // Generate the key
    const fullKey = this.generateApiKey();
    const keyHash = this.hashApiKey(fullKey);
    const keyPrefix = this.getKeyPrefix(fullKey);

    // Store in database
    const apiKey = await this.prisma.apiKey.create({
      data: {
        organizationId,
        name,
        keyHash,
        keyPrefix,
        scopes,
      },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        scopes: true,
        isActive: true,
        createdAt: true,
      },
    });

    // Return the full key (only time it's visible)
    return {
      ...apiKey,
      key: fullKey,
    };
  }

  /**
   * Delete an API key
   */
  async deleteApiKey(userId: string, keyId: string) {
    const organizationId = await this.getOrganizationId(userId);

    // Verify ownership
    const apiKey = await this.prisma.apiKey.findFirst({
      where: {
        id: keyId,
        organizationId,
      },
    });

    if (!apiKey) {
      throw new NotFoundException('API ključ nije pronađen');
    }

    await this.prisma.apiKey.delete({
      where: { id: keyId },
    });

    return { success: true, message: 'API ključ uspješno obrisan' };
  }

  /**
   * Validate an API key and update usage stats
   * Used by authentication guard
   */
  async validateApiKey(key: string): Promise<{ organizationId: string; scopes: string[] } | null> {
    const keyHash = this.hashApiKey(key);

    const apiKey = await this.prisma.apiKey.findFirst({
      where: {
        keyHash,
        isActive: true,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } },
        ],
      },
    });

    if (!apiKey) {
      return null;
    }

    // Update usage stats (fire and forget)
    this.prisma.apiKey.update({
      where: { id: apiKey.id },
      data: {
        lastUsedAt: new Date(),
        usageCount: { increment: 1 },
      },
    }).catch(() => {});

    return {
      organizationId: apiKey.organizationId,
      scopes: apiKey.scopes,
    };
  }
}
