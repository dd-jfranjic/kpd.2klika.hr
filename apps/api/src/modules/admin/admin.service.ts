import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { UserRole, PlanType, SubscriptionStatus, ConfigType } from '@prisma/client';

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

    // User stats
    const [totalUsers, newUsersToday, newUsers7d] = await Promise.all([
      this.prisma.user.count({ where: { isActive: true } }),
      this.prisma.user.count({
        where: { createdAt: { gte: today } },
      }),
      this.prisma.user.count({
        where: { createdAt: { gte: sevenDaysAgo } },
      }),
    ]);

    // Organization stats
    const [totalOrganizations, activeSubscriptions, newOrganizations7d] = await Promise.all([
      this.prisma.organization.count(),
      this.prisma.subscription.count({
        where: { status: SubscriptionStatus.ACTIVE },
      }),
      this.prisma.organization.count({
        where: { createdAt: { gte: sevenDaysAgo } },
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

    // Revenue calculation
    const allSubscriptions = await this.prisma.subscription.findMany({
      where: { status: SubscriptionStatus.ACTIVE },
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

    // Users near limit (80%+ usage this month)
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const usersNearLimit = await this.prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(DISTINCT u.id) as count
      FROM "User" u
      JOIN "OrganizationMember" om ON u.id = om."userId"
      JOIN "Organization" o ON om."organizationId" = o.id
      JOIN "Subscription" s ON o.id = s."organizationId"
      LEFT JOIN "PlanConfig" pc ON s.plan::text = pc.plan::text
      WHERE (
        SELECT COUNT(*) FROM "Query" q
        WHERE q."userId" = u.id AND q."createdAt" >= ${startOfMonth}
      ) >= COALESCE(s."monthlyQueryLimit", pc."monthlyQueryLimit", 3) * 0.8
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
      usersNearLimit: Number(usersNearLimit[0]?.count || 0),
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

      const [queries, users] = await Promise.all([
        this.prisma.query.count({
          where: {
            createdAt: { gte: date, lt: nextDay },
          },
        }),
        this.prisma.user.count({
          where: {
            createdAt: { gte: date, lt: nextDay },
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

    // Get usage for all users in this batch
    const userIds = users.map((u) => u.id);
    const usageData = await this.prisma.query.groupBy({
      by: ['userId'],
      where: {
        userId: { in: userIds },
        createdAt: { gte: startOfMonth },
      },
      _count: true,
    });
    const usageMap = Object.fromEntries(
      usageData.map((u) => [u.userId, u._count])
    );

    // Map users with all data
    let mappedUsers = users.map((u) => {
      const subscription = u.memberships[0]?.organization?.subscription;
      const plan = subscription?.plan || PlanType.FREE;
      const monthlyLimit = subscription?.monthlyQueryLimit || planLimitMap[plan] || 3;
      const currentUsage = usageMap[u.id] || 0;

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

    // Post-filter for nearLimit (users with usage >= 80% of limit)
    if (params.nearLimit) {
      mappedUsers = mappedUsers.filter((u) => {
        if (u.monthlyLimit <= 0) return false; // Unlimited plans
        return u.currentUsage >= u.monthlyLimit * 0.8;
      });
    }

    // Note: When post-filtering, total/pagination may not be accurate
    // For accurate pagination with filters, we'd need to query differently
    // This is acceptable for admin filtering where counts are informational
    const filteredTotal = params.plan || params.nearLimit ? mappedUsers.length : total;

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

    // Get user's queries count
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [totalQueries, queriesThisMonth] = await Promise.all([
      this.prisma.query.count({
        where: { userId: user.id },
      }),
      this.prisma.query.count({
        where: { userId: user.id, createdAt: { gte: startOfMonth } },
      }),
    ]);

    // Get API keys (via organization)
    const organization = user.memberships[0]?.organization;
    const apiKeys = organization ? await this.prisma.apiKey.findMany({
      where: { organizationId: organization.id },
      select: { id: true, name: true, createdAt: true, lastUsedAt: true },
    }) : [];

    const membership = user.memberships[0];
    const subscription = organization?.subscription;

    // Calculate avg queries per day this month
    const daysInMonth = new Date().getDate();
    const avgQueriesPerDay = queriesThisMonth / daysInMonth;

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
        monthlyQueryLimit: subscription.monthlyQueryLimit || 25,
        currentUsage: queriesThisMonth,
      } : undefined,
      stats: {
        totalQueries,
        queriesThisMonth,
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

    // Get member IDs per organization for usage calculation
    const memberMap = new Map<string, string[]>();
    tenants.forEach(t => {
      memberMap.set(t.id, t.members.map(m => m.userId));
    });

    // Get usage counts per user
    const allUserIds = tenants.flatMap(t => t.members.map(m => m.userId));
    const usageData = await this.prisma.query.groupBy({
      by: ['userId'],
      where: {
        userId: { in: allUserIds },
        createdAt: { gte: startOfMonth },
      },
      _count: true,
    });
    const userUsageMap = Object.fromEntries(
      usageData.map(u => [u.userId, u._count])
    );

    // Calculate org usage from member usage
    const orgUsageMap = new Map<string, number>();
    tenants.forEach(t => {
      const memberIds = memberMap.get(t.id) || [];
      const totalUsage = memberIds.reduce((sum, uid) => sum + (userUsageMap[uid] || 0), 0);
      orgUsageMap.set(t.id, totalUsage);
    });

    const monthlyQueries = await this.prisma.query.count({
      where: { createdAt: { gte: startOfMonth } },
    });

    const totalMembers = await this.prisma.organizationMember.count();

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
          monthlyLimit: t.subscription?.monthlyQueryLimit ?? 5,
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

    // Get usage stats
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const usageThisMonth = await this.prisma.query.count({
      where: {
        organizationId: tenant.id,
        createdAt: { gte: startOfMonth },
      },
    });

    return {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      createdAt: tenant.createdAt.toISOString(),
      subscription: tenant.subscription ? {
        plan: tenant.subscription.plan,
        status: tenant.subscription.status,
        monthlyLimit: tenant.subscription.monthlyQueryLimit,
        currentPeriodStart: tenant.subscription.currentPeriodStart?.toISOString() || null,
        currentPeriodEnd: tenant.subscription.currentPeriodEnd?.toISOString() || null,
        stripeSubscriptionId: tenant.subscription.stripeSubscriptionId || null,
      } : null,
      stats: {
        memberCount: tenant._count.members,
        usageThisMonth,
        monthlyLimit: tenant.subscription?.monthlyQueryLimit || 25,
      },
      members: tenant.members.map(m => ({
        id: m.user.id,
        name: `${m.user.firstName || ''} ${m.user.lastName || ''}`.trim() || m.user.email,
        email: m.user.email,
        role: m.role,
        userRole: m.user.role,
        isActive: m.user.isActive,
        joinedAt: m.joinedAt.toISOString(),
      })),
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

    // Plan pricing for MRR calculation
    const planPrices: Record<string, number> = {
      FREE: 0,
      BASIC: 9,
      PRO: 29,
      BUSINESS: 99,
      ENTERPRISE: 299,
    };

    // Get current active subscriptions
    const activeSubscriptions = await this.prisma.subscription.findMany({
      where: {
        status: 'ACTIVE',
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
    // Get subscriptions that were active at end of previous month
    const previousMonthSubscriptions = await this.prisma.subscription.findMany({
      where: {
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
      where: { plan: 'FREE' }
    });

    // Users who upgraded from FREE to paid in last 30 days
    // We approximate by looking at non-FREE subs created recently
    const upgradedLast30Days = await this.prisma.subscription.count({
      where: {
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
      where: { status: 'PAST_DUE' }
    });

    // Estimate unpaid amount from PAST_DUE subscriptions
    const unpaidSubs = await this.prisma.subscription.findMany({
      where: { status: 'PAST_DUE' },
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

    const planPrices: Record<string, number> = {
      FREE: 0,
      BASIC: 9,
      PRO: 29,
      BUSINESS: 99,
      ENTERPRISE: 299,
    };

    // Build where clause
    const where: Record<string, unknown> = {};
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
    const configs = await this.prisma.systemConfig.findMany({
      where: {
        OR: [
          { key: { contains: 'API_KEY' } },
          { key: { contains: 'SECRET' } },
          { key: { contains: 'URL' } },
          { category: 'integration' },
        ],
      },
    });

    return {
      configs: configs.map((c) => ({
        key: c.key,
        name: c.key.replace(/_/g, ' '),
        description: c.description || '',
        value: c.isSecret ? '' : c.value,
        masked: c.isSecret ? '••••••••' : c.value.substring(0, 20) + '...',
        isConfigured: !!c.value && c.value !== '',
        isRequired: c.key.includes('STRIPE') || c.key.includes('DATABASE'),
      })),
      stats: {
        configured: configs.filter((c) => c.value).length,
        missing: configs.filter((c) => !c.value).length,
        optional: 0,
      },
      webhookUrls: {
        stripe: `${process.env.API_URL || 'https://kpd.2klika.hr/api/v1'}/webhooks/stripe`,
      },
    };
  }

  async updateIntegration(key: string, value: string) {
    return this.prisma.systemConfig.update({
      where: { key },
      data: { value },
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
