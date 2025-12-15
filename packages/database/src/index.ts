// Re-export Prisma Client
export { prisma, type PrismaClient } from './client';

// Re-export all generated types
export * from '@prisma/client';

// Export type helpers - only types from new schema
export type {
  Organization,
  User,
  OrganizationMember,
  Subscription,
  KpdCode,
  KpdCategory,
  Query,
  UsageRecord,
  SystemConfig,
  PlanConfig,
  AuditLog,
  Invitation,
  // Enums
  UserRole,
  MemberRole,
  PlanType,
  SubscriptionStatus,
  InvitationStatus,
  ConfigType,
} from '@prisma/client';
