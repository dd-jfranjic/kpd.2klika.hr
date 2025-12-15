# DATABASE SCHEMA - KPD 2klika

**Verzija**: 1.0
**Referencirano iz**: MASTER_PLAN.md, PHASE_1_FRESH_START.md

---

## Prisma Schema

```prisma
// =====================================
// CORE MULTI-TENANT MODELS
// =====================================

model Organization {
  id                String   @id @default(cuid())
  name              String   // "Tvrtka d.o.o." ili "Ivan's Workspace"
  slug              String   @unique // URL-friendly: "tvrtka-doo"

  // Stripe Integration
  stripeCustomerId  String?  @unique

  // Settings (sve u bazi, nista hardkodirano!)
  settings          Json     @default("{}")

  // Timestamps
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  // Relations
  members           OrganizationMember[]
  subscription      Subscription?
  usageRecords      UsageRecord[]
  invitations       Invitation[]

  @@index([stripeCustomerId])
}

model User {
  id                String   @id @default(cuid())
  email             String   @unique
  passwordHash      String

  // Profile
  firstName         String?
  lastName          String?
  avatarUrl         String?

  // Role (za SUPER_ADMIN pristup admin panelu)
  role              UserRole @default(MEMBER)

  // Status
  isActive          Boolean  @default(true)
  emailVerified     Boolean  @default(false)
  lastLoginAt       DateTime?

  // Timestamps
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  // Relations
  memberships       OrganizationMember[]
  sentInvitations   Invitation[]
  auditLogs         AuditLog[]

  @@index([email])
}

enum UserRole {
  MEMBER       // Obicni korisnik
  SUPER_ADMIN  // Master admin - pristup /admin/*
}

model OrganizationMember {
  id             String   @id @default(cuid())

  organizationId String
  userId         String

  role           MemberRole @default(MEMBER)
  joinedAt       DateTime   @default(now())

  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  user           User         @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([organizationId, userId])
  @@index([organizationId])
  @@index([userId])
}

enum MemberRole {
  OWNER    // Kreator workspacea - full control
  ADMIN    // Moze invite/remove membere
  MEMBER   // Standardni pristup
}

// =====================================
// INVITATION SYSTEM
// =====================================

model Invitation {
  id             String   @id @default(cuid())
  email          String
  token          String   @unique @default(cuid())

  organizationId String
  invitedById    String
  role           MemberRole @default(MEMBER)

  status         InvitationStatus @default(PENDING)
  expiresAt      DateTime
  acceptedAt     DateTime?

  createdAt      DateTime @default(now())

  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  invitedBy      User         @relation(fields: [invitedById], references: [id])

  @@index([email])
  @@index([token])
  @@index([organizationId])
}

enum InvitationStatus {
  PENDING
  ACCEPTED
  EXPIRED
  CANCELLED
}

// =====================================
// SUBSCRIPTION & BILLING
// =====================================

model Subscription {
  id                    String   @id @default(cuid())
  organizationId        String   @unique

  // Stripe IDs
  stripeSubscriptionId  String?  @unique
  stripePriceId         String?

  // Plan Details
  plan                  PlanType @default(FREE)
  status                SubscriptionStatus @default(ACTIVE)

  // Billing Cycle
  currentPeriodStart    DateTime?
  currentPeriodEnd      DateTime?
  cancelAtPeriodEnd     Boolean  @default(false)

  // Usage Limits (iz PlanConfig)
  dailyQueryLimit       Int      @default(5)
  monthlyQueryLimit     Int?     // null = unlimited

  // Timestamps
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt

  organization          Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  @@index([stripeSubscriptionId])
  @@index([plan])
}

enum PlanType {
  FREE        // 5 upita/dan, besplatno
  BASIC       // 50 upita/dan, 9.99EUR/mj
  PRO         // 250 upita/dan, 19.99EUR/mj
  ENTERPRISE  // 2000 upita/dan, 49.99EUR/mj
}

enum SubscriptionStatus {
  ACTIVE
  PAST_DUE
  CANCELLED
  TRIALING
  PAUSED
}

// =====================================
// USAGE TRACKING
// =====================================

model UsageRecord {
  id             String   @id @default(cuid())
  organizationId String

  // Period
  periodStart    DateTime
  periodEnd      DateTime

  // Counters
  queryCount     Int      @default(0)
  aiQueryCount   Int      @default(0)

  // Reset tracking
  lastResetAt    DateTime @default(now())

  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  @@unique([organizationId, periodStart])
  @@index([organizationId])
  @@index([periodStart])
}

// =====================================
// KPD DATA (Kopirano iz FiskalAI)
// =====================================

model KpdCategory {
  id          String   @id
  name        String
  description String?
  level       Int
  parentId    String?
  isActive    Boolean  @default(true)
  version     String   @default("2025")

  parent      KpdCategory?  @relation("CategoryHierarchy", fields: [parentId], references: [id])
  children    KpdCategory[] @relation("CategoryHierarchy")
  codes       KpdCode[]

  @@index([parentId])
  @@index([level])
}

model KpdCode {
  id          String   @id  // Format: XX.XX.XX
  name        String   @db.VarChar(500)
  description String?
  categoryId  String
  level       Int
  parentId    String?
  fullPath    String?  @db.VarChar(50)
  codeNumeric Int?     // Za sortiranje: 620111 za "62.01.11"
  isFinal     Boolean  @default(false)
  version     String   @default("2025")
  isActive    Boolean  @default(true)

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  category    KpdCategory @relation(fields: [categoryId], references: [id])
  parent      KpdCode?    @relation("CodeHierarchy", fields: [parentId], references: [id])
  children    KpdCode[]   @relation("CodeHierarchy")
  queries     Query[]

  @@index([categoryId])
  @@index([parentId])
  @@index([level])
  @@index([isFinal, isActive])
  @@index([codeNumeric])
  @@index([name])
}

// =====================================
// QUERY HISTORY & ANALYTICS
// =====================================

model Query {
  id             String   @id @default(cuid())
  organizationId String
  userId         String?

  // Query Details
  inputText      String
  suggestedCodes String[] // Array of KPD codes
  selectedCode   String?  // Kod koji je korisnik odabrao

  // AI Response
  aiModel        String?
  confidence     Float?
  latencyMs      Int?
  cached         Boolean  @default(false)

  // Context
  ipAddress      String?
  userAgent      String?

  createdAt      DateTime @default(now())

  selectedKpd    KpdCode? @relation(fields: [selectedCode], references: [id])

  @@index([organizationId])
  @@index([userId])
  @@index([createdAt])
}

// =====================================
// SYSTEM CONFIGURATION (SVE U BAZI!)
// =====================================

model SystemConfig {
  id          String   @id @default(cuid())
  key         String   @unique
  value       String   @db.Text
  type        ConfigType @default(STRING)
  category    String   @default("general")
  description String?
  isSecret    Boolean  @default(false) // Encrypted in DB

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([category])
}

enum ConfigType {
  STRING
  NUMBER
  BOOLEAN
  JSON
  SECRET  // AES-256 encrypted
}

model PlanConfig {
  id                String   @id @default(cuid())
  plan              PlanType @unique

  // Pricing
  monthlyPriceEur   Float
  stripePriceId     String?
  stripeProductId   String?

  // Limits
  dailyQueryLimit   Int
  monthlyQueryLimit Int?     // null = unlimited
  membersLimit      Int?     // null = unlimited

  // Features (JSON za fleksibilnost)
  features          Json     @default("[]")

  // Display
  displayName       String
  description       String?
  isPopular         Boolean  @default(false)
  sortOrder         Int      @default(0)

  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
}

// =====================================
// AUDIT LOG (Admin akcije)
// =====================================

model AuditLog {
  id          String   @id @default(cuid())
  userId      String?  // SUPER_ADMIN koji je napravio akciju

  action      String   // CREATE_USER, UPDATE_PLAN, etc.
  entityType  String   // User, Organization, etc.
  entityId    String?

  oldValue    Json?
  newValue    Json?

  ipAddress   String?
  userAgent   String?

  createdAt   DateTime @default(now())

  user        User? @relation(fields: [userId], references: [id])

  @@index([userId])
  @@index([entityType, entityId])
  @@index([createdAt])
}
```

---

## Vizualni Pregled Relacija

```
                    ┌────────────────┐
                    │     User       │
                    │  (svi korisnici)│
                    └───────┬────────┘
                            │ role: MEMBER | SUPER_ADMIN
                            │
          ┌─────────────────┼─────────────────┐
          │                 │                 │
          ▼                 ▼                 ▼
┌─────────────────┐  ┌────────────┐  ┌────────────────┐
│ OrgMember       │  │ Invitation │  │   AuditLog     │
│ (pripadnost org)│  │ (pozivnice)│  │ (admin akcije) │
└────────┬────────┘  └─────┬──────┘  └────────────────┘
         │                 │
         ▼                 ▼
┌─────────────────────────────────────────────┐
│              Organization                    │
│         (workspace/tvrtka)                   │
└───────────────────┬─────────────────────────┘
                    │
      ┌─────────────┼─────────────┐
      │             │             │
      ▼             ▼             ▼
┌───────────┐ ┌───────────┐ ┌──────────────┐
│Subscription│ │UsageRecord│ │   Query      │
│ (Stripe)   │ │ (usage)   │ │ (KPD upiti)  │
└───────────┘ └───────────┘ └──────┬───────┘
                                   │
                                   ▼
                           ┌──────────────┐
                           │   KpdCode    │
                           │ (3300+ sifri)│
                           └──────────────┘
```

---

## Seed Data

### PlanConfig Seed:

```typescript
const plans = [
  {
    plan: 'FREE',
    monthlyPriceEur: 0,
    dailyQueryLimit: 5,
    monthlyQueryLimit: null,
    membersLimit: 1,
    displayName: 'KPD Free',
    description: 'Osnovna pretraga',
    features: ['Osnovna AI pretraga', 'Do 5 upita dnevno'],
    sortOrder: 0,
  },
  {
    plan: 'BASIC',
    monthlyPriceEur: 9.99,
    dailyQueryLimit: 50,
    monthlyQueryLimit: null,
    membersLimit: 3,
    displayName: 'KPD Basic',
    description: 'Za male poduzetnike',
    features: ['50 upita dnevno', 'Do 3 clana', 'Query history'],
    sortOrder: 1,
  },
  {
    plan: 'PRO',
    monthlyPriceEur: 19.99,
    dailyQueryLimit: 250,
    monthlyQueryLimit: null,
    membersLimit: 10,
    displayName: 'KPD Pro',
    description: 'Za rastuce timove',
    features: ['250 upita dnevno', 'Do 10 clanova', 'Batch upload', 'Export'],
    isPopular: true,
    sortOrder: 2,
  },
  {
    plan: 'ENTERPRISE',
    monthlyPriceEur: 49.99,
    dailyQueryLimit: 2000,
    monthlyQueryLimit: null,
    membersLimit: null, // unlimited
    displayName: 'KPD Enterprise',
    description: 'Za velike organizacije',
    features: ['2000 upita dnevno', 'Unlimited clanova', 'Priority support', 'Custom branding'],
    sortOrder: 3,
  },
];
```

### SUPER_ADMIN Seed:

```typescript
// Kreirati SUPER_ADMIN korisnika rucno u bazi
const superAdmin = {
  email: 'admin@2klika.hr',
  passwordHash: await bcrypt.hash('secure_password', 12),
  firstName: 'Super',
  lastName: 'Admin',
  role: 'SUPER_ADMIN',
  emailVerified: true,
  isActive: true,
};
```

---

**Veza s fazama:**
- Koristi se u: PHASE_1_FRESH_START.md (migracija)
- Referencirano iz: PHASE_2_AUTH.md (User model), PHASE_3_BILLING.md (Subscription)
