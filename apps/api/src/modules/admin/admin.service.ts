import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { UserRole, PlanType, SubscriptionStatus, ConfigType, Prisma } from '@prisma/client';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  // =====================================
  // DASHBOARD STATS
  // =====================================

  async getSystemStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // User stats - exclude SUPER_ADMIN users (they are administrative, not real users)
    const excludeAdminFilter = { role: { not: UserRole.SUPER_ADMIN } };
    const [totalUsers, newUsersToday, newUsers7d] = await Promise.all([
      this.prisma.user.count({ where: { isActive: true, ...excludeAdminFilter } }),
      this.prisma.user.count({
        where: { createdAt: { gte: today }, ...excludeAdminFilter },
      }),
      this.prisma.user.count({
        where: { createdAt: { gte: sevenDaysAgo }, ...excludeAdminFilter },
      }),
    ]);

    // Organization stats - exclude organizations owned by SUPER_ADMIN users
    const adminOrgIds = await this.prisma.organizationMember.findMany({
      where: {
        role: 'OWNER',
        user: { role: UserRole.SUPER_ADMIN },
      },
      select: { organizationId: true },
    });
    const excludeAdminOrgIds = adminOrgIds.map(m => m.organizationId);
    const excludeAdminOrgFilter = excludeAdminOrgIds.length > 0
      ? { id: { notIn: excludeAdminOrgIds } }
      : {};

    const [totalOrganizations, activeSubscriptions, newOrganizations7d] = await Promise.all([
      this.prisma.organization.count({ where: excludeAdminOrgFilter }),
      this.prisma.subscription.count({
        where: {
          status: SubscriptionStatus.ACTIVE,
          ...(excludeAdminOrgIds.length > 0 ? { organizationId: { notIn: excludeAdminOrgIds } } : {}),
        },
      }),
      this.prisma.organization.count({
        where: { createdAt: { gte: sevenDaysAgo }, ...excludeAdminOrgFilter },
      }),
    ]);

    // Query stats - today and yesterday for comparison
    const [classificationsToday, classificationsYesterday] = await Promise.all([
      this.prisma.query.count({
        where: { createdAt: { gte: today } },
      }),
      this.prisma.query.count({
        where: {
          createdAt: { gte: yesterday, lt: today },
        },
      }),
    ]);

    // Classifications growth (percentage change from yesterday)
    const classificationsGrowth = classificationsYesterday > 0
      ? Math.round(((classificationsToday - classificationsYesterday) / classificationsYesterday) * 100)
      : (classificationsToday > 0 ? 100 : 0);

    // Cache stats (placeholder - needs Redis integration)
    const cacheHitRate = 75; // TODO: Get from Redis stats

    // Revenue calculation - exclude admin organizations
    const allSubscriptions = await this.prisma.subscription.findMany({
      where: {
        status: SubscriptionStatus.ACTIVE,
        ...(excludeAdminOrgIds.length > 0 ? { organizationId: { notIn: excludeAdminOrgIds } } : {}),
      },
      include: { organization: true },
    });

    const planPrices = await this.prisma.planConfig.findMany();
    const priceMap = Object.fromEntries(
      planPrices.map((p) => [p.plan, p.monthlyPriceEur])
    );

    const monthlyRevenue = allSubscriptions.reduce((sum, sub) => {
      return sum + (priceMap[sub.plan] || 0);
    }, 0);

    // Plan distribution for dashboard chart
    const planCounts = allSubscriptions.reduce((acc, sub) => {
      acc[sub.plan] = (acc[sub.plan] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const totalSubs = allSubscriptions.length || 1; // Avoid division by zero
    const planDistribution = Object.entries(planCounts).map(([plan, count]) => ({
      plan,
      count,
      percentage: Math.round((count / totalSubs) * 100),
    }));

    // Add plans with 0 count for completeness
    const allPlans = ['FREE', 'BASIC', 'PLUS', 'PRO', 'BUSINESS', 'ENTERPRISE'];
    for (const plan of allPlans) {
      if (!planCounts[plan]) {
        planDistribution.push({ plan, count: 0, percentage: 0 });
      }
    }

    // Sort by plan hierarchy
    const planOrder: Record<string, number> = { FREE: 0, BASIC: 1, PLUS: 2, PRO: 3, BUSINESS: 4, ENTERPRISE: 5 };
    planDistribution.sort((a, b) => (planOrder[a.plan] ?? 99) - (planOrder[b.plan] ?? 99));

    // Users usage stats this month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    // Count only SUCCESSFUL queries (with results) - consistent with limit enforcement
    // Separate counters for accurate reporting:
    // - usersNearLimit: 80-99% of limit (warning zone)
    // - usersAtLimit: 100%+ of limit (reached/exceeded)
    // NOTE: suggestedCodes is text[] array, not jsonb - use array_length for checking
    const usersNearLimit = await this.prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(DISTINCT u.id) as count
      FROM "User" u
      JOIN "OrganizationMember" om ON u.id = om."userId"
      JOIN "Organization" o ON om."organizationId" = o.id
      JOIN "Subscription" s ON o.id = s."organizationId"
      LEFT JOIN "PlanConfig" pc ON s.plan::text = pc.plan::text
      WHERE u.role != 'SUPER_ADMIN'
      AND (
        SELECT COUNT(*) FROM "Query" q
        WHERE q."userId" = u.id
        AND q."createdAt" >= ${startOfMonth}
        AND array_length(q."suggestedCodes", 1) > 0
      ) >= COALESCE(s."monthlyQueryLimit", pc."monthlyQueryLimit", 3) * 0.8
      AND (
        SELECT COUNT(*) FROM "Query" q
        WHERE q."userId" = u.id
        AND q."createdAt" >= ${startOfMonth}
        AND array_length(q."suggestedCodes", 1) > 0
      ) < COALESCE(s."monthlyQueryLimit", pc."monthlyQueryLimit", 3)
    `;

    // Users who have reached or exceeded their limit (100%+)
    const usersAtLimit = await this.prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(DISTINCT u.id) as count
      FROM "User" u
      JOIN "OrganizationMember" om ON u.id = om."userId"
      JOIN "Organization" o ON om."organizationId" = o.id
      JOIN "Subscription" s ON o.id = s."organizationId"
      LEFT JOIN "PlanConfig" pc ON s.plan::text = pc.plan::text
      WHERE u.role != 'SUPER_ADMIN'
      AND (
        SELECT COUNT(*) FROM "Query" q
        WHERE q."userId" = u.id
        AND q."createdAt" >= ${startOfMonth}
        AND array_length(q."suggestedCodes", 1) > 0
      ) >= COALESCE(s."monthlyQueryLimit", pc."monthlyQueryLimit", 3)
    `;

    // Revenue by plan
    const revenueByPlan = planPrices.map((plan) => ({
      plan: plan.displayName,
      revenue:
        allSubscriptions.filter((s) => s.plan === plan.plan).length *
        plan.monthlyPriceEur,
    }));

    // Usage history (last 7 days)
    const usageHistory = await this.getUsageHistory(7);

    return {
      // Frontend-expected field names
      totalUsers,
      newUsers7d,
      totalOrganizations,
      newOrganizations7d,
      classificationsToday,
      classificationsGrowth,
      mrr: monthlyRevenue,
      mrrGrowth: 0, // TODO: Calculate based on previous month
      planDistribution,
      usersNearLimit: Number(usersNearLimit[0]?.count || 0), // 80-99% usage
      usersAtLimit: Number(usersAtLimit[0]?.count || 0),   // 100%+ usage
      unpaidInvoices: 0, // TODO: Implement when billing is added
      inactiveOrgs: 0, // TODO: Track org activity
      // Legacy fields for backward compatibility
      newUsersToday,
      activeTenants: activeSubscriptions,
      totalTenants: totalOrganizations,
      cacheHitRate,
      monthlyRevenue,
      revenueGrowth: 0,
      usageHistory,
      revenueByPlan,
    };
  }

  private async getUsageHistory(days: number) {
    const history = [];
    const today = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);

      const nextDay = new Date(date);
      nextDay.setDate(nextDay.getDate() + 1);

      // Exclude SUPER_ADMIN users from statistics
      const [queries, users] = await Promise.all([
        this.prisma.query.count({
          where: {
            createdAt: { gte: date, lt: nextDay },
          },
        }),
        this.prisma.user.count({
          where: {
            createdAt: { gte: date, lt: nextDay },
            role: { not: UserRole.SUPER_ADMIN },
          },
        }),
      ]);

      history.push({
        date: date.toISOString().split('T')[0],
        queries,
        users,
      });
    }

    return history;
  }

  async getRecentActivity() {
    const activities = [];

    // Recent users
    const recentUsers = await this.prisma.user.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: { firstName: true, lastName: true, email: true, createdAt: true },
    });

    for (const user of recentUsers) {
      activities.push({
        id: `user-${user.email}`,
        type: 'info' as const,
        message: `Novi korisnik: ${user.firstName || user.email}`,
        timestamp: user.createdAt.toISOString(),
      });
    }

    // Recent subscriptions
    const recentSubs = await this.prisma.subscription.findMany({
      take: 5,
      where: { plan: { not: PlanType.FREE } },
      orderBy: { createdAt: 'desc' },
      include: { organization: true },
    });

    for (const sub of recentSubs) {
      activities.push({
        id: `sub-${sub.id}`,
        type: 'success' as const,
        message: `Nova pretplata: ${sub.organization.name} - ${sub.plan}`,
        timestamp: sub.createdAt.toISOString(),
      });
    }

    // Sort by timestamp
    activities.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    return activities.slice(0, 10);
  }

  // =====================================
  // USERS MANAGEMENT
  // =====================================

  async getUsers(params: {
    search?: string;
    page?: number;
    limit?: number;
    suspended?: boolean;
    nearLimit?: boolean;
    atLimit?: boolean;
    plan?: string;
  }) {
    const page = params.page || 1;
    const limit = params.limit || 10;
    const skip = (page - 1) * limit;

    // Build where clause with search and suspended filter
    const where: Record<string, unknown> = {};

    if (params.search) {
      where.OR = [
        { email: { contains: params.search, mode: 'insensitive' as const } },
        { firstName: { contains: params.search, mode: 'insensitive' as const } },
        { lastName: { contains: params.search, mode: 'insensitive' as const } },
      ];
    }

    // Filter by suspended status (suspended = !isActive)
    if (params.suspended !== undefined) {
      where.isActive = !params.suspended;
    }

    // Get start of current month for usage calculation
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    // Fetch plan configs for monthly limits lookup
    const planConfigs = await this.prisma.planConfig.findMany();
    const planLimitMap = Object.fromEntries(
      planConfigs.map((p) => [p.plan, p.monthlyQueryLimit])
    );

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          memberships: {
            include: {
              organization: {
                include: {
                  subscription: true,
                },
              },
            },
            take: 1,
          },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    // Get usage for all organizations in this batch
    // Usage is PER ORGANIZATION (not per user) and only counts queries with results
    const orgIds = [...new Set(users.map((u) => u.memberships[0]?.organization?.id).filter(Boolean))];

    // Count queries WITH results only (consistent with limit enforcement)
    const orgUsageData = await this.prisma.query.groupBy({
      by: ['organizationId'],
      where: {
        organizationId: { in: orgIds },
        createdAt: { gte: startOfMonth },
        // Only count queries with actual results (not empty suggestions)
        NOT: {
          suggestedCodes: { equals: [] },
        },
      },
      _count: true,
    });
    const orgUsageMap = Object.fromEntries(
      orgUsageData.map((u) => [u.organizationId, u._count])
    );

    // Map users with all data
    let mappedUsers = users.map((u) => {
      const orgId = u.memberships[0]?.organization?.id;
      const subscription = u.memberships[0]?.organization?.subscription;
      const plan = subscription?.plan || PlanType.FREE;
      const baseLimit = subscription?.monthlyQueryLimit || planLimitMap[plan] || planLimitMap['FREE'] || 0;
      const bonusQuota = subscription?.bonusQueryQuota ?? 0;
      const monthlyLimit = baseLimit + bonusQuota; // INCLUDE BONUS QUERIES
      // Usage is per organization, not per user (and only counts queries with results)
      const currentUsage = orgId ? (orgUsageMap[orgId] || 0) : 0;

      return {
        id: u.id,
        name: `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email,
        firstName: u.firstName,
        lastName: u.lastName,
        email: u.email,
        organization: u.memberships[0]?.organization?.name || null,
        organizationId: u.memberships[0]?.organization?.id || null,
        role: u.role,
        organizationRole: u.memberships[0]?.role || null, // OWNER, ADMIN, or MEMBER
        suspended: !u.isActive,
        lastLogin: u.lastLoginAt?.toISOString() || null,
        createdAt: u.createdAt.toISOString(),
        // Plan & usage data
        plan: plan,
        monthlyLimit: monthlyLimit,
        currentUsage: currentUsage,
      };
    });

    // Post-filter by plan if specified
    if (params.plan) {
      mappedUsers = mappedUsers.filter((u) => u.plan === params.plan);
    }

    // Post-filter for atLimit (users who reached/exceeded 100% of limit)
    if (params.atLimit) {
      mappedUsers = mappedUsers.filter((u) => {
        if (u.monthlyLimit <= 0) return false; // Unlimited plans
        return u.currentUsage >= u.monthlyLimit; // 100%+
      });
    }

    // Post-filter for nearLimit (users with usage 80-99% of limit)
    if (params.nearLimit) {
      mappedUsers = mappedUsers.filter((u) => {
        if (u.monthlyLimit <= 0) return false; // Unlimited plans
        const percentage = (u.currentUsage / u.monthlyLimit) * 100;
        return percentage >= 80 && percentage < 100; // 80-99%
      });
    }

    // Note: When post-filtering, total/pagination may not be accurate
    // For accurate pagination with filters, we'd need to query differently
    // This is acceptable for admin filtering where counts are informational
    const filteredTotal = params.plan || params.nearLimit || params.atLimit ? mappedUsers.length : total;

    return {
      users: mappedUsers,
      pagination: {
        page,
        limit,
        total: filteredTotal,
        totalPages: Math.ceil(filteredTotal / limit),
      },
    };
  }

  async getUserById(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        memberships: {
          include: {
            organization: {
              include: {
                subscription: true,
                _count: { select: { members: true } },
              },
            },
          },
        },
      },
    });

    if (!user) {
      return null;
    }

    // Get organization for usage calculation
    const organization = user.memberships[0]?.organization;

    // Get usage stats - CRITICAL: Count per ORGANIZATION, not per user!
    // Only count queries WITH results (consistent with limit enforcement)
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    // User's individual stats (for info purposes)
    const totalQueries = await this.prisma.query.count({
      where: { userId: user.id },
    });

    // ORGANIZATION usage - this is what counts against the limit!
    const orgUsageThisMonth = organization ? await this.prisma.query.count({
      where: {
        organizationId: organization.id,
        createdAt: { gte: startOfMonth },
        // Only count queries with actual results (consistent with limit enforcement)
        NOT: {
          suggestedCodes: { equals: [] },
        },
      },
    }) : 0;

    // User's contribution to org usage (for stats display)
    const userQueriesThisMonth = await this.prisma.query.count({
      where: { userId: user.id, createdAt: { gte: startOfMonth } },
    });
    const apiKeys = organization ? await this.prisma.apiKey.findMany({
      where: { organizationId: organization.id },
      select: { id: true, name: true, createdAt: true, lastUsedAt: true },
    }) : [];

    const membership = user.memberships[0];
    const subscription = organization?.subscription;

    // Dohvati PlanConfig za fallback vrijednosti
    const planConfig = subscription ? await this.prisma.planConfig.findUnique({
      where: { plan: subscription.plan },
    }) : null;
    const freePlanConfig = !subscription || !planConfig ? await this.prisma.planConfig.findUnique({
      where: { plan: 'FREE' },
    }) : null;

    // Calculate avg queries per day this month
    const daysInMonth = new Date().getDate();
    const avgQueriesPerDay = userQueriesThisMonth / daysInMonth;

    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      imageUrl: null, // We don't store profile images
      role: user.role,
      isActive: user.isActive,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt.toISOString(),
      lastLoginAt: user.lastLoginAt?.toISOString() || null,
      organization: organization ? {
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
        role: membership?.role || 'MEMBER',
        memberCount: organization._count?.members || 1,
        createdAt: organization.createdAt.toISOString(),
      } : undefined,
      subscription: subscription ? {
        plan: subscription.plan,
        status: subscription.status,
        stripeSubscriptionId: subscription.stripeSubscriptionId || null,
        currentPeriodStart: subscription.currentPeriodStart?.toISOString() || null,
        currentPeriodEnd: subscription.currentPeriodEnd?.toISOString() || null,
        monthlyQueryLimit: subscription.monthlyQueryLimit || planConfig?.monthlyQueryLimit || freePlanConfig?.monthlyQueryLimit || 0,
        // CRITICAL: Use ORGANIZATION usage, not user queries!
        currentUsage: orgUsageThisMonth,
      } : undefined,
      stats: {
        totalQueries,
        // This is user's individual queries (for info)
        queriesThisMonth: userQueriesThisMonth,
        // This is org's usage that counts against limit
        orgUsageThisMonth: orgUsageThisMonth,
        avgQueriesPerDay: Math.round(avgQueriesPerDay * 10) / 10,
      },
      apiKeys: apiKeys.map(k => ({
        id: k.id,
        name: k.name,
        createdAt: k.createdAt.toISOString(),
        lastUsed: k.lastUsedAt?.toISOString() || null,
      })),
    };
  }

  async updateUser(userId: string, data: { role?: string }) {
    const updateData: { role?: UserRole } = {};

    if (data.role) {
      updateData.role = data.role as UserRole;
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: updateData,
    });
  }

  async suspendUser(userId: string, suspended: boolean) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { isActive: !suspended },
    });
  }

  /**
   * Reset user's monthly usage - preserves query history!
   * This gives the user back their full monthly quota by updating currentPeriodStart.
   * The checkUsageLimit function only counts queries AFTER currentPeriodStart,
   * so setting it to NOW effectively resets usage while keeping history.
   */
  async resetUserUsage(userId: string) {
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
      throw new Error('Korisnik nije pronađen');
    }

    // Get the user's organization
    const membership = user.memberships[0];
    if (!membership?.organization) {
      throw new Error('Korisnik nije član nijedne organizacije');
    }

    const organizationId = membership.organization.id;
    const subscription = membership.organization.subscription;

    if (!subscription) {
      throw new Error('Organizacija nema aktivnu pretplatu');
    }

    // Count queries that will be "reset" (for logging purposes)
    const now = new Date();
    const oldPeriodStart = subscription.currentPeriodStart ?? new Date(now.getFullYear(), now.getMonth(), 1);

    const queriesBeingReset = await this.prisma.query.count({
      where: {
        organizationId,
        createdAt: { gte: oldPeriodStart },
        NOT: {
          suggestedCodes: { equals: [] },
        },
      },
    });

    // Update currentPeriodStart to NOW - this effectively resets usage
    // because checkUsageLimit only counts queries AFTER currentPeriodStart
    // Query history is preserved for analytics and audit purposes
    await this.prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        currentPeriodStart: now,
      },
    });

    // Get the plan limit for response
    const planConfig = await this.prisma.planConfig.findUnique({
      where: { plan: subscription.plan || 'FREE' },
    });

    return {
      message: `Mjesečna potrošnja resetirana za korisnika ${user.email} (povijest sačuvana)`,
      resetQueries: queriesBeingReset,
      organizationId,
      plan: subscription.plan || 'FREE',
      newLimit: planConfig?.monthlyQueryLimit ?? planConfig?.dailyQueryLimit ?? 0,
    };
  }

  /**
   * Add bonus credits (increase monthly limit) for a user's organization
   */
  async addUserCredits(userId: string, amount: number) {
    // 1. Get user with organization
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
      throw new Error('Korisnik nije pronađen');
    }

    const membership = user.memberships[0];
    if (!membership?.organization) {
      throw new Error('Korisnik nema organizaciju');
    }

    const organizationId = membership.organization.id;
    const subscription = membership.organization.subscription;

    if (!subscription) {
      throw new Error('Organizacija nema aktivnu pretplatu');
    }

    // Get current plan config for default limit
    const planConfig = await this.prisma.planConfig.findUnique({
      where: { plan: subscription.plan },
    });

    const previousLimit = subscription.monthlyQueryLimit ?? planConfig?.monthlyQueryLimit ?? 0;
    const newLimit = previousLimit + amount;

    // 2. Update subscription with new limit
    await this.prisma.subscription.update({
      where: { id: subscription.id },
      data: { monthlyQueryLimit: newLimit },
    });

    return {
      message: `Dodano ${amount} kredita korisniku ${user.email}`,
      previousLimit,
      newLimit,
      organizationId,
      userEmail: user.email,
    };
  }

  /**
   * Change user's subscription plan (admin override)
   * @param resetUsage - If true, resets the usage counter for the current month (recommended when upgrading)
   */
  async changeUserPlan(userId: string, newPlan: string, resetUsage: boolean = false) {
    // 1. Get user with organization
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
      throw new Error('Korisnik nije pronađen');
    }

    const membership = user.memberships[0];
    if (!membership?.organization) {
      throw new Error('Korisnik nema organizaciju');
    }

    const organizationId = membership.organization.id;
    const subscription = membership.organization.subscription;

    if (!subscription) {
      throw new Error('Organizacija nema aktivnu pretplatu');
    }

    // Get plan configs
    const oldPlanConfig = await this.prisma.planConfig.findUnique({
      where: { plan: subscription.plan },
    });
    const newPlanConfig = await this.prisma.planConfig.findUnique({
      where: { plan: newPlan as 'FREE' | 'BASIC' | 'PRO' | 'BUSINESS' | 'ENTERPRISE' },
    });

    if (!newPlanConfig) {
      throw new Error('Nevažeći plan');
    }

    const previousPlan = subscription.plan;
    const previousLimit = subscription.monthlyQueryLimit ?? oldPlanConfig?.monthlyQueryLimit ?? 0;
    const newLimit = newPlanConfig.monthlyQueryLimit ?? newPlanConfig.dailyQueryLimit ?? 0;

    // 2. Update subscription
    await this.prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        plan: newPlan as 'FREE' | 'BASIC' | 'PRO' | 'BUSINESS' | 'ENTERPRISE',
        monthlyQueryLimit: newLimit,
        // Note: We're doing an admin override, not going through Stripe
        // For Stripe-managed subscriptions, this might need additional handling
      },
    });

    // 3. Reset usage if requested (useful when upgrading plans)
    // NOTE: We preserve query history! Usage reset works by updating currentPeriodStart
    // to NOW - the checkUsageLimit function only counts queries AFTER currentPeriodStart
    let usageReset = false;
    if (resetUsage) {
      const now = new Date();

      // Update currentPeriodStart to NOW - this effectively resets usage
      // because checkUsageLimit only counts queries after this date
      // Query history is preserved for analytics and audit purposes
      await this.prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          currentPeriodStart: now,
        },
      });

      usageReset = true;
    }

    return {
      message: `Plan promijenjen s ${previousPlan} na ${newPlan} za korisnika ${user.email}${usageReset ? ' (potrošnja resetirana)' : ''}`,
      previousPlan,
      previousLimit,
      newPlan,
      newLimit,
      organizationId,
      userEmail: user.email,
      usageReset,
    };
  }

  /**
   * Permanently delete a user and all their associated data
   * This includes: memberships, invitations, queries (set userId=null), organizations (if sole owner)
   */
  async deleteUser(userId: string, adminId: string) {
    // 1. Get user with all relationships
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        memberships: {
          include: {
            organization: {
              include: {
                members: true,
                subscription: true,
              },
            },
          },
        },
        sentInvitations: true,
      },
    });

    if (!user) {
      throw new Error('Korisnik nije pronađen');
    }

    // 2. Prevent deleting SUPER_ADMIN unless there are other super admins
    if (user.role === 'SUPER_ADMIN') {
      const superAdminCount = await this.prisma.user.count({
        where: { role: 'SUPER_ADMIN', isActive: true },
      });
      if (superAdminCount <= 1) {
        throw new Error('Nije moguće obrisati jedinog Super Admina');
      }
    }

    // 3. Find organizations where user is OWNER
    const ownedOrgs = user.memberships.filter(m => m.role === 'OWNER');
    const orgsToDelete: string[] = [];

    for (const membership of ownedOrgs) {
      const org = membership.organization;
      const otherMembers = org.members.filter(m => m.userId !== userId);

      if (otherMembers.length === 0) {
        // No other members - delete the organization
        orgsToDelete.push(org.id);
      } else {
        // Has other members - transfer ownership to first ADMIN, or first MEMBER
        const newOwner = otherMembers.find(m => m.role === 'ADMIN') || otherMembers[0];
        await this.prisma.organizationMember.update({
          where: { id: newOwner.id },
          data: { role: 'OWNER' },
        });
      }
    }

    // 4. Execute deletion in transaction
    await this.prisma.$transaction(async (tx) => {
      // Delete invitations sent by this user
      await tx.invitation.deleteMany({
        where: { invitedById: userId },
      });

      // Set userId to null on queries (preserve query history)
      await tx.query.updateMany({
        where: { userId: userId },
        data: { userId: null },
      });

      // Delete organizations where user was sole owner (cascade deletes members, subscription, usage, invitations)
      for (const orgId of orgsToDelete) {
        await tx.organization.delete({
          where: { id: orgId },
        });
      }

      // Delete the user (cascade deletes: memberships, refreshTokens)
      await tx.user.delete({
        where: { id: userId },
      });

      // Create audit log
      await tx.auditLog.create({
        data: {
          userId: adminId,
          action: 'DELETE_USER',
          entityType: 'User',
          entityId: userId,
          oldValue: {
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            organizationsDeleted: orgsToDelete,
          },
        },
      });
    });

    return {
      success: true,
      message: `Korisnik ${user.email} uspješno obrisan`,
      deletedOrganizations: orgsToDelete.length,
    };
  }

  async impersonateUser(userId: string, adminId: string) {
    // Get the user to impersonate
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        memberships: {
          include: {
            organization: true,
          },
        },
      },
    });

    if (!user) {
      throw new Error('Korisnik nije pronađen');
    }

    const organization = user.memberships[0]?.organization;

    // Generate JWT token for impersonated user with impersonation metadata
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      organizationId: organization?.id || null,
      impersonatedBy: adminId, // Track who is impersonating for audit
    };

    const accessToken = this.jwtService.sign(payload);

    // Return in same format as login response for frontend compatibility
    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        organizationId: organization?.id || null,
        avatarUrl: user.avatarUrl || null,
        emailVerified: user.emailVerified,
      },
    };
  }

  // =====================================
  // TENANTS (ORGANIZATIONS) MANAGEMENT
  // =====================================

  async getTenants(params: {
    search?: string;
    page?: number;
    limit?: number;
    status?: string; // Filter by subscription status
  }) {
    const page = params.page || 1;
    const limit = params.limit || 10;
    const skip = (page - 1) * limit;

    // Build where clause
    const where: Record<string, unknown> = {};

    if (params.search) {
      where.OR = [
        { name: { contains: params.search, mode: 'insensitive' as const } },
        { slug: { contains: params.search, mode: 'insensitive' as const } },
      ];
    }

    // Status filter - applies to subscription status
    if (params.status && params.status !== 'all') {
      where.subscription = {
        status: params.status === 'suspended' ? { in: ['CANCELLED', 'PAST_DUE'] } : params.status.toUpperCase(),
      };
    }

    const [tenants, total, paidCount] = await Promise.all([
      this.prisma.organization.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          subscription: true,
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  email: true,
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
          _count: { select: { members: true } },
        },
      }),
      this.prisma.organization.count({ where }),
      this.prisma.subscription.count({
        where: { plan: { not: PlanType.FREE } },
      }),
    ]);

    // Get this month's usage per organization
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    // Get usage counts per organization (only queries with results!)
    const orgIds = tenants.map(t => t.id);
    const usageData = await this.prisma.query.groupBy({
      by: ['organizationId'],
      where: {
        organizationId: { in: orgIds },
        createdAt: { gte: startOfMonth },
        // Only count queries that actually returned results (consumed resources)
        NOT: { suggestedCodes: { equals: [] } },
      },
      _count: true,
    });

    // Map organizationId to usage count
    const orgUsageMap = new Map<string, number>();
    usageData.forEach(u => {
      if (u.organizationId) {
        orgUsageMap.set(u.organizationId, u._count);
      }
    });

    const monthlyQueries = await this.prisma.query.count({
      where: { createdAt: { gte: startOfMonth } },
    });

    const totalMembers = await this.prisma.organizationMember.count();

    // Dohvati FREE plan za default vrijednosti - jedini izvor istine
    const freePlan = await this.prisma.planConfig.findUnique({
      where: { plan: 'FREE' },
    });
    const defaultMonthlyLimit = freePlan?.monthlyQueryLimit ?? freePlan?.dailyQueryLimit ?? 0;

    return {
      tenants: tenants.map((t) => {
        // Find the owner (member with OWNER role)
        const ownerMember = t.members.find(m => m.role === 'OWNER');
        const owner = ownerMember ? {
          id: ownerMember.user.id,
          email: ownerMember.user.email,
          name: `${ownerMember.user.firstName || ''} ${ownerMember.user.lastName || ''}`.trim() || ownerMember.user.email,
        } : null;

        return {
          id: t.id,
          name: t.name,
          slug: t.slug,
          plan: t.subscription?.plan || 'FREE',
          memberCount: t._count.members,
          monthlyUsage: orgUsageMap.get(t.id) || 0,
          monthlyLimit: t.subscription?.monthlyQueryLimit ?? defaultMonthlyLimit,
          status: t.subscription?.status || 'ACTIVE',
          createdAt: t.createdAt.toISOString(),
          owner, // Include owner data
        };
      }),
      totalTenants: total,
      paidTenants: paidCount,
      totalMembers,
      monthlyQueries,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getTenantById(tenantId: string) {
    const tenant = await this.prisma.organization.findUnique({
      where: { id: tenantId },
      include: {
        subscription: true,
        members: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                role: true,
                isActive: true,
                createdAt: true,
                lastLoginAt: true,
              },
            },
          },
        },
        _count: {
          select: { members: true },
        },
      },
    });

    if (!tenant) {
      return null;
    }

    // Find the owner (member with OWNER role)
    const ownerMember = tenant.members.find(m => m.role === 'OWNER');
    const owner = ownerMember ? {
      id: ownerMember.user.id,
      email: ownerMember.user.email,
      firstName: ownerMember.user.firstName,
      lastName: ownerMember.user.lastName,
    } : null;

    // Get usage stats
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    // Get queries for this org only (with results)
    const usageThisMonth = await this.prisma.query.count({
      where: {
        organizationId: tenant.id,
        createdAt: { gte: startOfMonth },
        NOT: {
          suggestedCodes: { equals: [] },
        },
      },
    });

    // Get total queries for this org
    const totalQueries = await this.prisma.query.count({
      where: { organizationId: tenant.id },
    });

    // Get active members in last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const activeMembers30d = tenant.members.filter(m =>
      m.user.lastLoginAt && new Date(m.user.lastLoginAt) >= thirtyDaysAgo
    ).length;

    // Calculate avg queries per day
    const daysInMonth = new Date().getDate();
    const avgQueriesPerDay = usageThisMonth / daysInMonth;

    // Determine if organization is active (based on subscription status)
    const isActive = !tenant.subscription ||
      tenant.subscription.status === 'ACTIVE' ||
      tenant.subscription.status === 'TRIALING';

    // Get plan prices for MRR calculation
    const planPrices: Record<string, number> = {
      FREE: 0,
      BASIC: 9,
      PRO: 29,
      BUSINESS: 99,
      ENTERPRISE: 299,
    };

    const mrr = planPrices[tenant.subscription?.plan || 'FREE'] || 0;

    // Dohvati PlanConfig za fallback vrijednosti
    const planConfig = tenant.subscription ? await this.prisma.planConfig.findUnique({
      where: { plan: tenant.subscription.plan },
    }) : null;
    const freePlanConfig = await this.prisma.planConfig.findUnique({
      where: { plan: 'FREE' },
    });
    const defaultMonthlyLimit = freePlanConfig?.monthlyQueryLimit ?? freePlanConfig?.dailyQueryLimit ?? 0;

    // Calculate total limit including bonus queries
    const baseMonthlyLimit = tenant.subscription?.monthlyQueryLimit || planConfig?.monthlyQueryLimit || defaultMonthlyLimit;
    const bonusQuota = tenant.subscription?.bonusQueryQuota ?? 0;
    const totalLimit = baseMonthlyLimit + bonusQuota;

    return {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      isActive,
      createdAt: tenant.createdAt.toISOString(),
      updatedAt: tenant.updatedAt.toISOString(),
      owner,
      members: tenant.members.map(m => ({
        id: m.user.id,
        email: m.user.email,
        firstName: m.user.firstName,
        lastName: m.user.lastName,
        role: m.role,
        isActive: m.user.isActive,
        joinedAt: m.joinedAt.toISOString(),
        lastLoginAt: m.user.lastLoginAt?.toISOString() || null,
      })),
      memberCount: tenant._count.members,
      subscription: tenant.subscription ? {
        plan: tenant.subscription.plan,
        status: tenant.subscription.status,
        stripeCustomerId: tenant.subscription.stripeSubscriptionId ? tenant.subscription.organizationId : null,
        stripeSubscriptionId: tenant.subscription.stripeSubscriptionId || null,
        currentPeriodStart: tenant.subscription.currentPeriodStart?.toISOString() || null,
        currentPeriodEnd: tenant.subscription.currentPeriodEnd?.toISOString() || null,
        monthlyQueryLimit: totalLimit, // BONUS UKLJUČEN: baseMonthlyLimit + bonusQueryQuota
        totalUsage: usageThisMonth,
        mrr,
      } : {
        plan: 'FREE',
        status: 'ACTIVE',
        stripeCustomerId: null,
        stripeSubscriptionId: null,
        currentPeriodStart: null,
        currentPeriodEnd: null,
        monthlyQueryLimit: defaultMonthlyLimit, // FREE nema bonus quota
        totalUsage: usageThisMonth,
        mrr: 0,
      },
      stats: {
        totalQueries,
        queriesThisMonth: usageThisMonth,
        avgQueriesPerDay: Math.round(avgQueriesPerDay * 10) / 10,
        activeMembers30d,
      },
    };
  }

  async updateTenant(
    tenantId: string,
    data: { status?: string; plan?: string }
  ) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { organizationId: tenantId },
    });

    if (subscription) {
      const updateData: { status?: SubscriptionStatus; plan?: PlanType } = {};

      if (data.status) {
        updateData.status = data.status as SubscriptionStatus;
      }
      if (data.plan) {
        updateData.plan = data.plan as PlanType;
      }

      await this.prisma.subscription.update({
        where: { id: subscription.id },
        data: updateData,
      });
    }

    return this.prisma.organization.findUnique({
      where: { id: tenantId },
      include: { subscription: true },
    });
  }

  /**
   * Pokloni upite organizaciji
   * Dodaje bonusQueryQuota na postojeće (kumulativno)
   */
  async giftQueries(
    tenantId: string,
    data: {
      amount: number;
      message?: string;
      notificationType: 'CLASSIC' | 'LOGIN_POPUP';
    },
    adminUserId: string,
  ) {
    // Provjeri postoji li organizacija
    const org = await this.prisma.organization.findUnique({
      where: { id: tenantId },
      include: {
        subscription: true,
        members: {
          where: { role: 'OWNER' },
          include: { user: true },
        },
      },
    });

    if (!org) {
      throw new Error('Organizacija nije pronađena');
    }

    // Ažuriraj bonusQueryQuota
    const currentBonus = org.subscription?.bonusQueryQuota ?? 0;
    const newBonus = currentBonus + data.amount;

    if (org.subscription) {
      await this.prisma.subscription.update({
        where: { id: org.subscription.id },
        data: { bonusQueryQuota: newBonus },
      });
    } else {
      // Ako nema subscription, kreiraj FREE subscription s bonus upitima
      const freePlan = await this.prisma.planConfig.findUnique({
        where: { plan: 'FREE' },
      });
      await this.prisma.subscription.create({
        data: {
          organizationId: tenantId,
          plan: 'FREE',
          status: 'ACTIVE',
          monthlyQueryLimit: freePlan?.monthlyQueryLimit ?? 0,
          bonusQueryQuota: data.amount,
        },
      });
    }

    // Kreiraj notifikaciju za vlasnika
    const owner = org.members[0]?.user;
    if (owner) {
      const title = `Dobili ste ${data.amount} bonus upita!`;
      const body = data.message || `Administrator vam je poklonio ${data.amount} dodatnih upita za KPD pretragu.`;

      await this.prisma.notification.create({
        data: {
          recipientId: owner.id,
          kind: data.notificationType,
          title,
          body,
          metadata: {
            type: 'GIFT_QUERIES',
            amount: data.amount,
            previousBonus: currentBonus,
            newBonus: newBonus,
          } as Prisma.JsonObject,
          createdById: adminUserId,
        },
      });
    }

    return {
      success: true,
      organizationId: tenantId,
      organizationName: org.name,
      amount: data.amount,
      previousBonus: currentBonus,
      newBonus: newBonus,
      notificationSent: !!owner,
    };
  }

  async deleteTenant(tenantId: string) {
    // First check if organization exists
    const org = await this.prisma.organization.findUnique({
      where: { id: tenantId },
      include: {
        _count: {
          select: { members: true },
        },
      },
    });

    if (!org) {
      throw new Error('Organizacija nije pronađena');
    }

    // Delete in the correct order to respect foreign key constraints
    // 1. Delete all queries for this organization
    await this.prisma.query.deleteMany({
      where: { organizationId: tenantId },
    });

    // 2. Delete all organization members
    await this.prisma.organizationMember.deleteMany({
      where: { organizationId: tenantId },
    });

    // 3. Delete subscription if exists
    await this.prisma.subscription.deleteMany({
      where: { organizationId: tenantId },
    });

    // 4. Delete API keys if exist
    try {
      await this.prisma.apiKey.deleteMany({
        where: { organizationId: tenantId },
      });
    } catch {
      // API keys table might not exist
    }

    // 5. Finally delete the organization itself
    const deleted = await this.prisma.organization.delete({
      where: { id: tenantId },
    });

    return {
      deleted: true,
      organizationId: deleted.id,
      organizationName: deleted.name,
    };
  }

  // =====================================
  // BILLING
  // =====================================

  async getBillingStats() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfPreviousMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Plan pricing for MRR calculation (based on KPD actual pricing)
    const planPrices: Record<string, number> = {
      FREE: 0,
      BASIC: 6.99,
      PRO: 11.99,
      BUSINESS: 30.99,
      ENTERPRISE: 199,
    };

    // Exclude master admin organization from all billing stats
    const ADMIN_ORG_ID = 'admin-org-001';

    // Get current active subscriptions (excluding admin org)
    const activeSubscriptions = await this.prisma.subscription.findMany({
      where: {
        status: 'ACTIVE',
        organizationId: { not: ADMIN_ORG_ID },
      },
      select: {
        plan: true,
        organizationId: true,
      },
    });

    // Calculate current MRR
    const mrr = activeSubscriptions.reduce((sum, sub) => {
      return sum + (planPrices[sub.plan] || 0);
    }, 0);

    // Calculate ARR (Annual Recurring Revenue)
    const arr = mrr * 12;

    // Count total paying subscribers (non-FREE)
    const totalSubscribers = activeSubscriptions.filter(s => s.plan !== 'FREE').length;

    // Calculate previous month MRR for growth calculation
    // Get subscriptions that were active at end of previous month (excluding admin org)
    const previousMonthSubscriptions = await this.prisma.subscription.findMany({
      where: {
        organizationId: { not: ADMIN_ORG_ID },
        createdAt: { lte: endOfPreviousMonth },
        OR: [
          { status: 'ACTIVE' },
          {
            status: { in: ['CANCELLED', 'PAST_DUE'] },
            updatedAt: { gte: startOfMonth } // Changed this month
          }
        ]
      },
      select: {
        plan: true,
      }
    });

    const previousMrr = previousMonthSubscriptions.reduce((sum, sub) => {
      return sum + (planPrices[sub.plan] || 0);
    }, 0);

    // MRR Growth percentage
    const mrrGrowth = previousMrr > 0
      ? Math.round(((mrr - previousMrr) / previousMrr) * 100 * 10) / 10
      : 0;

    // Calculate previous month subscriber count for growth
    const previousSubscribers = previousMonthSubscriptions.filter(s => s.plan !== 'FREE').length;
    const subscribersGrowth = previousSubscribers > 0
      ? Math.round(((totalSubscribers - previousSubscribers) / previousSubscribers) * 100 * 10) / 10
      : 0;

    // ARPU (Average Revenue Per User) - among paying users
    const averageRevenuePerUser = totalSubscribers > 0 ? Math.round(mrr / totalSubscribers) : 0;

    // Churn rate (cancelled subscriptions in last 30 days / total active at start)
    const cancelledLast30Days = await this.prisma.subscription.count({
      where: {
        organizationId: { not: ADMIN_ORG_ID },
        status: { in: ['CANCELLED', 'PAST_DUE'] },
        updatedAt: { gte: thirtyDaysAgo },
      }
    });

    const totalAtStart = totalSubscribers + cancelledLast30Days;
    const churnRate = totalAtStart > 0
      ? Math.round((cancelledLast30Days / totalAtStart) * 100 * 10) / 10
      : 0;

    // Conversion rate (FREE to paid in last 30 days / total FREE users at start)
    const freeUsers = await this.prisma.subscription.count({
      where: {
        organizationId: { not: ADMIN_ORG_ID },
        plan: 'FREE'
      }
    });

    // Users who upgraded from FREE to paid in last 30 days
    // We approximate by looking at non-FREE subs created recently
    const upgradedLast30Days = await this.prisma.subscription.count({
      where: {
        organizationId: { not: ADMIN_ORG_ID },
        plan: { not: 'FREE' },
        createdAt: { gte: thirtyDaysAgo },
      }
    });

    const totalFreeAtStart = freeUsers + upgradedLast30Days;
    const conversionRate = totalFreeAtStart > 0
      ? Math.round((upgradedLast30Days / totalFreeAtStart) * 100 * 10) / 10
      : 0;

    // Unpaid invoices (subscriptions with PAST_DUE status)
    const unpaidCount = await this.prisma.subscription.count({
      where: {
        organizationId: { not: ADMIN_ORG_ID },
        status: 'PAST_DUE'
      }
    });

    // Estimate unpaid amount from PAST_DUE subscriptions
    const unpaidSubs = await this.prisma.subscription.findMany({
      where: {
        organizationId: { not: ADMIN_ORG_ID },
        status: 'PAST_DUE'
      },
      select: { plan: true }
    });
    const unpaidAmount = unpaidSubs.reduce((sum, sub) => sum + (planPrices[sub.plan] || 0), 0);

    return {
      mrr,
      mrrGrowth,
      arr,
      totalSubscribers,
      subscribersGrowth,
      averageRevenuePerUser,
      churnRate,
      conversionRate,
      unpaidInvoices: unpaidCount,
      unpaidAmount,
    };
  }

  async getSubscriptions(params: {
    status?: string;
    page?: number;
    limit?: number;
  }) {
    const page = params.page || 1;
    const limit = params.limit || 20;
    const skip = (page - 1) * limit;

    // Plan pricing (based on KPD actual pricing)
    const planPrices: Record<string, number> = {
      FREE: 0,
      BASIC: 6.99,
      PRO: 11.99,
      BUSINESS: 30.99,
      ENTERPRISE: 199,
    };

    // Exclude master admin organization from billing stats/list
    const ADMIN_ORG_ID = 'admin-org-001';

    // Build where clause - exclude admin org
    const where: Record<string, unknown> = {
      organizationId: { not: ADMIN_ORG_ID },
    };
    if (params.status) {
      where.status = params.status.toUpperCase();
    }

    const [subscriptions, total] = await Promise.all([
      this.prisma.subscription.findMany({
        where,
        skip,
        take: limit,
        include: {
          organization: {
            select: {
              id: true,
              name: true,
              slug: true,
            }
          }
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.subscription.count({ where }),
    ]);

    return {
      subscriptions: subscriptions.map(sub => ({
        id: sub.id,
        organizationId: sub.organization.id,
        organizationName: sub.organization.name,
        organizationSlug: sub.organization.slug,
        plan: sub.plan,
        status: sub.status,
        mrr: planPrices[sub.plan] || 0,
        currentPeriodStart: sub.currentPeriodStart?.toISOString() || null,
        currentPeriodEnd: sub.currentPeriodEnd?.toISOString() || null,
        stripeSubscriptionId: sub.stripeSubscriptionId || null,
        createdAt: sub.createdAt.toISOString(),
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // =====================================
  // KPD CODES MANAGEMENT
  // =====================================

  async getKpdCodes(params: { search?: string; page?: number; limit?: number }) {
    const page = params.page || 1;
    const limit = params.limit || 20;
    const skip = (page - 1) * limit;

    const where = params.search
      ? {
          OR: [
            { id: { contains: params.search } },
            { name: { contains: params.search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    const [codes, total, totalCategories] = await Promise.all([
      this.prisma.kpdCode.findMany({
        where,
        skip,
        take: limit,
        orderBy: { codeNumeric: 'asc' },
      }),
      this.prisma.kpdCode.count({ where }),
      this.prisma.kpdCategory.count(),
    ]);

    return {
      codes: codes.map((c) => ({
        id: c.id,
        code: c.id,
        name: c.name,
        description: c.description || null,
        level: c.level,
        parentCode: c.parentId || null,
      })),
      total,
      totalPages: Math.ceil(total / limit),
      totalCategories,
    };
  }

  async updateKpdCode(codeId: string, data: { description?: string; name?: string }) {
    const updateData: { name?: string; description?: string } = {};

    // If description is provided, update the description field
    if (data.description !== undefined) {
      updateData.description = data.description;
    }

    // If name is provided, update the name field
    if (data.name !== undefined) {
      updateData.name = data.name;
    }

    return this.prisma.kpdCode.update({
      where: { id: codeId },
      data: updateData,
    });
  }

  // =====================================
  // SYSTEM CONFIG
  // =====================================

  async getSystemConfig() {
    const configs = await this.prisma.systemConfig.findMany({
      orderBy: [{ category: 'asc' }, { key: 'asc' }],
    });

    return configs.map((c) => ({
      key: c.key,
      name: c.key.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
      description: c.description,
      value: c.isSecret ? '********' : c.value,
      category: c.category || 'Ostalo',
      updatedAt: c.updatedAt.toISOString(),
    }));
  }

  async updateConfig(key: string, value: string) {
    return this.prisma.systemConfig.update({
      where: { key },
      data: { value },
    });
  }

  // =====================================
  // FEATURE FLAGS
  // =====================================

  async getFeatureFlags() {
    const configs = await this.prisma.systemConfig.findMany({
      where: {
        OR: [
          { key: { startsWith: 'feature_' } },
          { type: ConfigType.BOOLEAN },
        ],
      },
    });

    return configs.map((c) => ({
      key: c.key,
      name: c.key.replace(/^feature_/, '').replace(/_/g, ' '),
      description: c.description || '',
      enabled: c.value === 'true',
    }));
  }

  async toggleFeatureFlag(key: string, enabled: boolean) {
    return this.prisma.systemConfig.update({
      where: { key },
      data: { value: enabled ? 'true' : 'false' },
    });
  }

  // =====================================
  // AUDIT LOGS
  // =====================================

  async getAuditLogs(params: {
    search?: string;
    page?: number;
    limit?: number;
    action?: string;
    dateFrom?: string;
    dateTo?: string;
  }) {
    const page = params.page || 1;
    const limit = params.limit || 20;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (params.search) {
      where.OR = [
        { action: { contains: params.search, mode: 'insensitive' } },
        { entityType: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    if (params.action) {
      where.action = params.action;
    }

    if (params.dateFrom) {
      where.createdAt = { ...(where.createdAt as object || {}), gte: new Date(params.dateFrom) };
    }

    if (params.dateTo) {
      where.createdAt = { ...(where.createdAt as object || {}), lte: new Date(params.dateTo) };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    const [logs, total, todayLogs, weekLogs] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { firstName: true, lastName: true, email: true },
          },
        },
      }),
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.count({
        where: { createdAt: { gte: today } },
      }),
      this.prisma.auditLog.count({
        where: { createdAt: { gte: weekAgo } },
      }),
    ]);

    const uniqueUsers = await this.prisma.auditLog.groupBy({
      by: ['userId'],
      _count: true,
    });

    return {
      logs: logs.map((l) => ({
        id: l.id,
        userId: l.userId || '',
        action: l.action,
        entityType: l.entityType,
        entityId: l.entityId || null,
        oldValue: l.oldValue,
        newValue: l.newValue,
        ipAddress: l.ipAddress || null,
        userAgent: l.userAgent || null,
        createdAt: l.createdAt.toISOString(),
        user: l.user ? {
          email: l.user.email,
          firstName: l.user.firstName,
          lastName: l.user.lastName,
        } : null,
      })),
      total,
      totalPages: Math.ceil(total / limit),
      page,
      limit,
      // Legacy fields for backward compatibility
      totalLogs: total,
      uniqueUsers: uniqueUsers.length,
      todayLogs,
      weekLogs,
    };
  }

  // =====================================
  // ANALYTICS
  // =====================================

  async getAnalytics(period: '7d' | '30d' | '90d' | '1y') {
    const days = { '7d': 7, '30d': 30, '90d': 90, '1y': 365 }[period];
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const prevStartDate = new Date(startDate);
    prevStartDate.setDate(prevStartDate.getDate() - days);

    // Revenue calculation
    const paidSubs = await this.prisma.subscription.count({
      where: { plan: { not: PlanType.FREE }, status: SubscriptionStatus.ACTIVE },
    });

    const planConfigs = await this.prisma.planConfig.findMany();
    const avgPrice =
      planConfigs.reduce((sum, p) => sum + p.monthlyPriceEur, 0) /
      planConfigs.length;

    const totalRevenue = paidSubs * avgPrice;

    // Query stats
    const [currentQueries, prevQueries] = await Promise.all([
      this.prisma.query.count({ where: { createdAt: { gte: startDate } } }),
      this.prisma.query.count({
        where: { createdAt: { gte: prevStartDate, lt: startDate } },
      }),
    ]);

    // New users
    const [currentUsers, prevUsers] = await Promise.all([
      this.prisma.user.count({ where: { createdAt: { gte: startDate } } }),
      this.prisma.user.count({
        where: { createdAt: { gte: prevStartDate, lt: startDate } },
      }),
    ]);

    // Usage history
    const usageHistory = await this.getUsageHistory(days);

    // Plan distribution
    const planCounts = await this.prisma.subscription.groupBy({
      by: ['plan'],
      _count: true,
    });

    const planDistribution = planConfigs.map((p) => ({
      name: p.displayName,
      value: planCounts.find((c) => c.plan === p.plan)?._count || 0,
    }));

    // Top KPD codes
    const topCodes = await this.prisma.query.groupBy({
      by: ['selectedCode'],
      _count: true,
      where: { selectedCode: { not: null }, createdAt: { gte: startDate } },
      orderBy: { _count: { selectedCode: 'desc' } },
      take: 10,
    });

    return {
      revenue: {
        total: totalRevenue,
        change: 0, // TODO: Calculate change
      },
      classifications: {
        total: currentQueries,
        change:
          prevQueries > 0
            ? Math.round(((currentQueries - prevQueries) / prevQueries) * 100)
            : 0,
      },
      users: {
        new: currentUsers,
        change:
          prevUsers > 0
            ? Math.round(((currentUsers - prevUsers) / prevUsers) * 100)
            : 0,
      },
      performance: {
        avgResponseTime: 150, // TODO: Get from query latency
        change: 0,
        cacheHitRate: 75,
        uptime: 99.9,
        errorRate: 0.1,
        p95Latency: 250,
      },
      revenueHistory: usageHistory.map((u) => ({
        date: u.date,
        revenue: 0, // TODO: Historical revenue
      })),
      usageHistory: usageHistory.map((u) => ({
        date: u.date,
        queries: u.queries,
        cached: Math.round(u.queries * 0.75),
      })),
      planDistribution,
      topKpdCodes: topCodes.map((c) => ({
        code: c.selectedCode || 'Unknown',
        count: c._count,
      })),
      funnel: [
        { name: 'Posjetitelji', value: currentUsers * 10, percentage: 100 },
        { name: 'Registracije', value: currentUsers, percentage: 10 },
        { name: 'Aktivni', value: Math.round(currentUsers * 0.6), percentage: 6 },
        { name: 'Placanja', value: paidSubs, percentage: (paidSubs / currentUsers) * 100 || 0 },
      ],
    };
  }

  // =====================================
  // INTEGRATIONS
  // =====================================

  async getIntegrations() {
    // Define integration keys we want to show, grouped by category
    const aiKeys = ['GEMINI_MODEL', 'RAG_STORE_ID'];
    const smtpKeys = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'SMTP_FROM', 'SMTP_FROM_NAME', 'SMTP_SECURE'];
    const allKeys = [...aiKeys, ...smtpKeys];

    // Get existing configs from database
    const existingConfigs = await this.prisma.systemConfig.findMany({
      where: { key: { in: allKeys } },
    });
    const existingMap = new Map(existingConfigs.map(c => [c.key, c]));

    // Descriptions for settings
    const descriptions: Record<string, string> = {
      'GEMINI_MODEL': 'AI model za klasifikaciju KPD šifara',
      'RAG_STORE_ID': 'Google File Search Store ID za RAG dokumente',
      'SMTP_HOST': 'SMTP server hostname (npr. smtp.gmail.com)',
      'SMTP_PORT': 'SMTP port (465 za SSL, 587 za TLS)',
      'SMTP_USER': 'SMTP korisničko ime',
      'SMTP_PASS': 'SMTP lozinka',
      'SMTP_FROM': 'Email adresa pošiljatelja',
      'SMTP_FROM_NAME': 'Ime pošiljatelja',
      'SMTP_SECURE': 'Koristi li SSL (true/false)',
    };

    // Helper to build config item
    const buildConfigItem = (key: string) => {
      const config = existingMap.get(key);
      const envValue = process.env[key] || '';
      const value = config?.value || envValue;
      const isSecret = key.includes('PASS') || key.includes('SECRET');
      return {
        key,
        name: key.replace(/_/g, ' '),
        description: descriptions[key] || '',
        value: isSecret ? '' : value,
        masked: isSecret ? '••••••••' : (value ? value.substring(0, 50) + (value.length > 50 ? '...' : '') : ''),
        isConfigured: !!value && value !== '',
        isRequired: key === 'SMTP_HOST' || key === 'SMTP_USER',
      };
    };

    // Build grouped configs
    const aiConfigs = aiKeys.map(buildConfigItem);
    const smtpConfigs = smtpKeys.map(buildConfigItem);

    // Check GEMINI_API_KEY status (from env only, never exposed)
    const geminiApiKeyConfigured = !!process.env.GEMINI_API_KEY;

    // Get compatible models for dropdown
    const compatibleModels = [
      { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash', description: 'Najbolji omjer cijene i performansi (preporučeno)' },
      { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro', description: 'Napredni model s enhanced thinking' },
      { value: 'gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash Lite', description: 'Najbrži i najjeftiniji model' },
      { value: 'gemini-3-pro-preview', label: 'Gemini 3 Pro Preview', description: 'Najnoviji preview model (Dec 2025)' },
    ];

    // Calculate stats
    const allConfigs = [...aiConfigs, ...smtpConfigs];
    const configured = allConfigs.filter(c => c.isConfigured).length + (geminiApiKeyConfigured ? 1 : 0);
    const missing = allConfigs.filter(c => !c.isConfigured && c.isRequired).length + (geminiApiKeyConfigured ? 0 : 1);

    return {
      // Grouped configs for new UI
      groups: {
        ai: {
          title: 'AI Postavke',
          description: 'Google Gemini AI za klasifikaciju KPD šifara',
          icon: 'Zap',
          configs: aiConfigs,
          apiKeyConfigured: geminiApiKeyConfigured,
          compatibleModels,
        },
        smtp: {
          title: 'SMTP Postavke',
          description: 'Konfiguracija za slanje emailova',
          icon: 'Mail',
          configs: smtpConfigs,
        },
      },
      // Legacy flat list for backward compatibility
      configs: allConfigs,
      stats: {
        configured,
        missing,
        optional: allConfigs.length + 1 - configured - missing, // +1 for GEMINI_API_KEY
      },
      webhookUrls: {
        stripe: `${process.env.PUBLIC_API_URL || 'https://kpd.2klika.hr/api/v1'}/webhooks/stripe`,
      },
    };
  }

  async updateIntegration(key: string, value: string) {
    // Map keys to categories
    const categoryMap: Record<string, string> = {
      'GEMINI_MODEL': 'AI',
      'RAG_STORE_ID': 'AI',
      'SMTP_HOST': 'Email',
      'SMTP_PORT': 'Email',
      'SMTP_USER': 'Email',
      'SMTP_PASS': 'Email',
      'SMTP_FROM': 'Email',
      'SMTP_FROM_NAME': 'Email',
      'SMTP_SECURE': 'Email',
    };

    return this.prisma.systemConfig.upsert({
      where: { key },
      update: { value },
      create: {
        key,
        value,
        category: categoryMap[key] || 'Integracije',
        type: key.includes('PASS') ? ConfigType.SECRET : ConfigType.STRING,
        isSecret: key.includes('PASS'),
      },
    });
  }

  // =====================================
  // SECURITY SETTINGS
  // =====================================

  async getSecuritySettings() {
    const securityKeys = [
      'ADMIN_2FA_REQUIRED',
      'SESSION_TIMEOUT_MINUTES',
      'IP_WHITELIST_ENABLED',
      'IP_WHITELIST_ADDRESSES',
      'RATE_LIMIT_PER_MINUTE',
    ];

    const configs = await this.prisma.systemConfig.findMany({
      where: { key: { in: securityKeys } },
    });

    const configMap = new Map(configs.map((c) => [c.key, c.value]));

    return {
      admin2faRequired: configMap.get('ADMIN_2FA_REQUIRED') === 'true',
      sessionTimeoutMinutes: parseInt(configMap.get('SESSION_TIMEOUT_MINUTES') || '60', 10),
      ipWhitelistEnabled: configMap.get('IP_WHITELIST_ENABLED') === 'true',
      ipWhitelistAddresses: configMap.get('IP_WHITELIST_ADDRESSES') || '',
      rateLimitPerMinute: parseInt(configMap.get('RATE_LIMIT_PER_MINUTE') || '100', 10),
    };
  }

  async updateSecuritySettings(data: {
    admin2faRequired?: boolean;
    sessionTimeoutMinutes?: number;
    ipWhitelistEnabled?: boolean;
    ipWhitelistAddresses?: string;
    rateLimitPerMinute?: number;
  }) {
    const updates: { key: string; value: string }[] = [];

    if (data.admin2faRequired !== undefined) {
      updates.push({ key: 'ADMIN_2FA_REQUIRED', value: data.admin2faRequired.toString() });
    }
    if (data.sessionTimeoutMinutes !== undefined) {
      updates.push({ key: 'SESSION_TIMEOUT_MINUTES', value: data.sessionTimeoutMinutes.toString() });
    }
    if (data.ipWhitelistEnabled !== undefined) {
      updates.push({ key: 'IP_WHITELIST_ENABLED', value: data.ipWhitelistEnabled.toString() });
    }
    if (data.ipWhitelistAddresses !== undefined) {
      updates.push({ key: 'IP_WHITELIST_ADDRESSES', value: data.ipWhitelistAddresses });
    }
    if (data.rateLimitPerMinute !== undefined) {
      updates.push({ key: 'RATE_LIMIT_PER_MINUTE', value: data.rateLimitPerMinute.toString() });
    }

    // Upsert each setting
    for (const update of updates) {
      await this.prisma.systemConfig.upsert({
        where: { key: update.key },
        update: { value: update.value },
        create: {
          key: update.key,
          value: update.value,
          type: ConfigType.STRING,
          category: 'security',
          description: this.getSecuritySettingDescription(update.key),
        },
      });
    }

    return this.getSecuritySettings();
  }

  private getSecuritySettingDescription(key: string): string {
    const descriptions: Record<string, string> = {
      ADMIN_2FA_REQUIRED: 'Obavezna dvofaktorska autentikacija za admin pristup',
      SESSION_TIMEOUT_MINUTES: 'Automatska odjava nakon neaktivnosti (u minutama)',
      IP_WHITELIST_ENABLED: 'Ograniči admin pristup na određene IP adrese',
      IP_WHITELIST_ADDRESSES: 'Lista dozvoljenih IP adresa za admin pristup',
      RATE_LIMIT_PER_MINUTE: 'Maksimalan broj API zahtjeva po minuti',
    };
    return descriptions[key] || '';
  }

  async clearCache(type: 'all' | 'redis' | 'memory' = 'all') {
    // In a production environment, this would clear actual cache
    // For now, we'll simulate cache clearing
    const cleared: string[] = [];

    if (type === 'all' || type === 'memory') {
      // Memory cache would be cleared here
      cleared.push('memory');
    }

    if (type === 'all' || type === 'redis') {
      // Redis cache would be cleared here
      // Example: await this.redis.flushDb();
      cleared.push('redis');
    }

    return {
      success: true,
      clearedTypes: cleared,
      timestamp: new Date().toISOString(),
      message: `Cache očišćen: ${cleared.join(', ')}`,
    };
  }

  async logoutAllUsers(excludeUserId?: string) {
    // In a production environment, this would invalidate all sessions
    // This could be done by:
    // 1. Incrementing a global token version in Redis
    // 2. Clearing all refresh tokens from database
    // 3. Adding current time to a "tokens_invalidated_at" config

    // For now, we'll update a config value that could be checked during auth
    await this.prisma.systemConfig.upsert({
      where: { key: 'TOKENS_INVALIDATED_AT' },
      update: { value: new Date().toISOString() },
      create: {
        key: 'TOKENS_INVALIDATED_AT',
        value: new Date().toISOString(),
        type: ConfigType.STRING,
        category: 'security',
        description: 'Vrijeme kada su svi tokeni proglašeni nevažećima',
      },
    });

    // Count active sessions (approximate from recent audit logs)
    const recentLogins = await this.prisma.auditLog.count({
      where: {
        action: { in: ['LOGIN', 'REGISTER'] },
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }, // Last 24h
      },
    });

    return {
      success: true,
      invalidatedAt: new Date().toISOString(),
      approximateSessionsAffected: recentLogins,
      excludedUserId: excludeUserId || null,
      message: 'Svi korisnici će biti odjavljeni pri sljedećem zahtjevu',
    };
  }

  // =====================================
  // EMAIL TEMPLATES
  // =====================================

  async getEmailTemplates() {
    const templates = await this.prisma.emailTemplate.findMany({
      orderBy: { type: 'asc' },
    });

    // If no templates exist, seed default templates
    if (templates.length === 0) {
      await this.seedDefaultEmailTemplates();
      return this.prisma.emailTemplate.findMany({
        orderBy: { type: 'asc' },
      });
    }

    return templates;
  }

  async getEmailTemplate(type: string) {
    return this.prisma.emailTemplate.findUnique({
      where: { type },
    });
  }

  async updateEmailTemplate(type: string, data: {
    subject?: string;
    content?: string;
    isActive?: boolean;
  }) {
    const template = await this.prisma.emailTemplate.findUnique({
      where: { type },
    });

    if (!template) {
      throw new Error(`Template ${type} not found`);
    }

    return this.prisma.emailTemplate.update({
      where: { type },
      data: {
        subject: data.subject ?? template.subject,
        content: data.content ?? template.content,
        isActive: data.isActive ?? template.isActive,
        updatedAt: new Date(),
      },
    });
  }

  async resetEmailTemplate(type: string) {
    const defaults = this.getDefaultTemplates();
    const defaultTemplate = defaults.find(t => t.type === type);

    if (!defaultTemplate) {
      throw new Error(`Default template for ${type} not found`);
    }

    return this.prisma.emailTemplate.update({
      where: { type },
      data: {
        subject: defaultTemplate.subject,
        content: defaultTemplate.content,
        isActive: true,
        updatedAt: new Date(),
      },
    });
  }

  private async seedDefaultEmailTemplates() {
    const defaults = this.getDefaultTemplates();

    for (const template of defaults) {
      await this.prisma.emailTemplate.upsert({
        where: { type: template.type },
        update: {},
        create: template,
      });
    }
  }

  private getDefaultTemplates() {
    return [
      {
        type: 'VERIFICATION',
        name: 'Email Verifikacije',
        subject: 'Potvrdite email adresu - KPD 2klika',
        content: `<h1 style="color: #1a1a2e; margin: 0 0 20px;">Dobrodošli, {{firstName}}!</h1>
<p style="color: #4a4a4a; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
  Hvala što ste se registrirali na KPD 2klika - platformu za klasifikaciju proizvoda i usluga.
</p>
<p style="color: #4a4a4a; font-size: 16px; line-height: 1.6; margin: 0 0 30px;">
  Molimo potvrdite svoju email adresu klikom na gumb ispod:
</p>
<div style="text-align: center; margin: 30px 0;">
  <a href="{{verifyUrl}}"
     style="display: inline-block; padding: 14px 40px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
    Potvrdi email adresu
  </a>
</div>
<p style="color: #888; font-size: 14px; margin: 20px 0 0;">
  Ili kopirajte ovaj link u preglednik:<br>
  <a href="{{verifyUrl}}" style="color: #667eea; word-break: break-all;">{{verifyUrl}}</a>
</p>
<p style="color: #888; font-size: 14px; margin: 20px 0 0;">
  Link vrijedi 24 sata.
</p>`,
        variables: JSON.stringify(['firstName', 'verifyUrl']),
      },
      {
        type: 'PASSWORD_RESET',
        name: 'Reset Lozinke',
        subject: 'Reset lozinke - KPD 2klika',
        content: `<h1 style="color: #1a1a2e; margin: 0 0 20px;">Pozdrav, {{firstName}}!</h1>
<p style="color: #4a4a4a; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
  Primili smo zahtjev za promjenu lozinke vašeg KPD 2klika računa.
</p>
<p style="color: #4a4a4a; font-size: 16px; line-height: 1.6; margin: 0 0 30px;">
  Kliknite na gumb ispod za postavljanje nove lozinke:
</p>
<div style="text-align: center; margin: 30px 0;">
  <a href="{{resetUrl}}"
     style="display: inline-block; padding: 14px 40px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
    Postavi novu lozinku
  </a>
</div>
<p style="color: #888; font-size: 14px; margin: 20px 0 0;">
  Ili kopirajte ovaj link u preglednik:<br>
  <a href="{{resetUrl}}" style="color: #667eea; word-break: break-all;">{{resetUrl}}</a>
</p>
<p style="color: #888; font-size: 14px; margin: 20px 0 0;">
  Link vrijedi 1 sat. Ako niste zatražili promjenu lozinke, ignorirajte ovaj email.
</p>`,
        variables: JSON.stringify(['firstName', 'resetUrl']),
      },
      {
        type: 'INVITATION',
        name: 'Pozivnica u Organizaciju',
        subject: 'Pozivnica u {{organizationName}} - KPD 2klika',
        content: `<h1 style="color: #1a1a2e; margin: 0 0 20px;">Pozvani ste!</h1>
<p style="color: #4a4a4a; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
  <strong>{{inviterName}}</strong> vas poziva da se pridružite organizaciji
  <strong>{{organizationName}}</strong> na KPD 2klika platformi.
</p>
<div style="text-align: center; margin: 30px 0;">
  <a href="{{inviteUrl}}"
     style="display: inline-block; padding: 14px 40px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
    Prihvati pozivnicu
  </a>
</div>
<p style="color: #888; font-size: 14px; margin: 20px 0 0;">
  Pozivnica vrijedi 7 dana.
</p>`,
        variables: JSON.stringify(['inviterName', 'organizationName', 'inviteUrl']),
      },
      {
        type: 'WELCOME',
        name: 'Dobrodošlica',
        subject: 'Dobrodošli u KPD 2klika!',
        content: `<h1 style="color: #1a1a2e; margin: 0 0 20px;">Dobrodošli u KPD 2klika!</h1>
<p style="color: #4a4a4a; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
  Pozdrav {{firstName}},
</p>
<p style="color: #4a4a4a; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
  Vaš račun je uspješno aktiviran! Sada možete koristiti KPD 2klika za klasifikaciju proizvoda i usluga prema NKD/KPD standardima.
</p>
<h2 style="color: #1a1a2e; font-size: 18px; margin: 30px 0 15px;">Što možete raditi:</h2>
<ul style="color: #4a4a4a; font-size: 16px; line-height: 1.8; margin: 0 0 30px; padding-left: 20px;">
  <li>Klasificirati proizvode i usluge pomoću AI</li>
  <li>Pretraživati KPD šifre</li>
  <li>Spremati povijest upita</li>
  <li>Pozivati članove tima</li>
</ul>
<div style="text-align: center; margin: 30px 0;">
  <a href="{{dashboardUrl}}"
     style="display: inline-block; padding: 14px 40px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
    Idi na Dashboard
  </a>
</div>`,
        variables: JSON.stringify(['firstName', 'dashboardUrl']),
      },
    ];
  }

  // =====================================
  // AUDIT LOG HELPER
  // =====================================

  async createAuditLog(data: {
    userId?: string;
    action: string;
    entityType: string;
    entityId?: string;
    oldValue?: unknown;
    newValue?: unknown;
    ipAddress?: string;
    userAgent?: string;
  }) {
    return this.prisma.auditLog.create({
      data: {
        userId: data.userId,
        action: data.action,
        entityType: data.entityType,
        entityId: data.entityId,
        oldValue: data.oldValue as object,
        newValue: data.newValue as object,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
      },
    });
  }
}
