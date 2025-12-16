import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Dohvati korisnika po ID-u
   */
  async findById(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        avatarUrl: true,
        role: true,
        isActive: true,
        emailVerified: true,
        createdAt: true,
        memberships: {
          select: {
            organizationId: true,
            role: true,
            organization: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('Korisnik nije pronađen');
    }

    // Get primary organization (first one for now)
    const primaryMembership = user.memberships[0];

    return {
      ...user,
      organizationId: primaryMembership?.organizationId || null,
      organizationRole: primaryMembership?.role || null,
      organization: primaryMembership?.organization || null,
    };
  }

  /**
   * Ažuriraj profil korisnika
   */
  async updateProfile(
    userId: string,
    data: { firstName?: string; lastName?: string; avatarUrl?: string },
  ) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        avatarUrl: true,
        role: true,
        isActive: true,
        emailVerified: true,
        createdAt: true,
      },
    });

    return user;
  }

  /**
   * Dohvati statistike korisnika za dashboard
   * Koristi mjesečne limite (ne dnevne!)
   */
  async getUserStats(userId: string) {
    // Get user with organization
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        memberships: {
          include: {
            organization: {
              include: {
                subscription: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('Korisnik nije pronađen');
    }

    const primaryMembership = user.memberships[0];
    const organizationId = primaryMembership?.organizationId;

    if (!organizationId) {
      // Dohvati FREE plan iz PlanConfig - jedini izvor istine
      const freePlan = await this.prisma.planConfig.findUnique({
        where: { plan: 'FREE' },
      });
      const defaultLimit = freePlan?.monthlyQueryLimit ?? freePlan?.dailyQueryLimit ?? 0;
      return {
        todayQueries: 0,
        monthQueries: 0,
        totalQueries: 0,
        monthlyLimit: defaultLimit,
        remainingThisMonth: defaultLimit,
        avgConfidence: 0,
        planName: 'FREE',
      };
    }

    // Calculate date ranges
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Get query counts and average confidence
    const [totalQueries, monthQueries, todayQueries, avgConfidenceResult] =
      await Promise.all([
        this.prisma.query.count({
          where: { organizationId },
        }),
        this.prisma.query.count({
          where: {
            organizationId,
            createdAt: { gte: startOfMonth },
          },
        }),
        this.prisma.query.count({
          where: {
            organizationId,
            createdAt: { gte: startOfDay },
          },
        }),
        this.prisma.query.aggregate({
          where: {
            organizationId,
            confidence: { not: null },
          },
          _avg: {
            confidence: true,
          },
        }),
      ]);

    // Get subscription info - use monthlyQueryLimit
    const subscription = primaryMembership?.organization?.subscription;
    let monthlyLimit = subscription?.monthlyQueryLimit;

    // Ako nema limit u subscriptioni, dohvati iz PlanConfig
    if (!monthlyLimit) {
      const freePlan = await this.prisma.planConfig.findUnique({
        where: { plan: 'FREE' },
      });
      monthlyLimit = freePlan?.monthlyQueryLimit ?? freePlan?.dailyQueryLimit ?? 0;
    }
    const planName = subscription?.plan || 'FREE';
    const remainingThisMonth = Math.max(0, monthlyLimit - monthQueries);

    // Calculate average confidence as percentage (0-100)
    const avgConfidence = avgConfidenceResult._avg.confidence
      ? Math.round(avgConfidenceResult._avg.confidence * 100)
      : 0;

    return {
      todayQueries,
      monthQueries,
      totalQueries,
      monthlyLimit,
      remainingThisMonth,
      avgConfidence,
      planName,
    };
  }
}
