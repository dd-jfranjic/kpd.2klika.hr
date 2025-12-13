# 🎯 KPD 2KLIKA - MASTER RAZVOJNI PLAN

**Verzija**: 1.0
**Datum**: 2025-12-13
**Status**: DRAFT - U razvoju

---

## 📋 EXECUTIVE SUMMARY

**Projekt**: AI KPD Klasifikator by 2klika
**Tip**: Multi-tenant SaaS aplikacija
**Cilj**: Komercijalizacija KPD klasifikacijskog alata iz FiskalAI projekta kao standalone SaaS proizvod

### Ključne Funkcionalnosti:
1. **AI KPD Klasifikacija** - Gemini RAG-based pretraživanje 3.300+ KPD šifri
2. **Multi-tenant Workspace** - Organizacije s invite member sustavom
3. **Subscription Billing** - 4 paketa (FREE, Basic, Pro, Enterprise) via Stripe
4. **Master Admin Panel** - Kompletno praćenje ekosustava
5. **Usage Tracking** - Praćenje upita po paketu/korisniku

---

## 🏗️ ARHITEKTURA

### Tech Stack (Potvrđen):
| Komponenta | Tehnologija | Status |
|------------|-------------|--------|
| Frontend | Next.js 15 + React 19 | ✅ Postavljen |
| Backend | NestJS 11 | ✅ Postavljen |
| Database | PostgreSQL 17 | ✅ Postavljen |
| Cache | Redis 7 | ✅ Postavljen |
| ORM | Prisma 6 | ✅ Postavljen |
| Auth | JWT (vlastiti) | ✅ Implementiran |
| Payments | Stripe | ⏳ Djelomično |
| AI | Google Gemini (RAG) | ⏳ Čeka config |
| Admin | Next.js (zasebna app) | ✅ Postavljen |

### Infrastruktura:
- **Server**: Hetzner (server.2klika.eu)
- **Domain**: kpd.2klika.hr
- **Docker**: 6 containera (web, api, admin, postgres, redis, pgbouncer)
- **SSL**: Let's Encrypt via Plesk

---

## 📊 DATABASE SCHEMA

### NOVI Modeli za Multi-tenant SaaS:

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

  // Settings (sve u bazi, ništa hardkodirano!)
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

  @@index([email])
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
  ADMIN    // Može invite/remove membere
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
  BASIC       // 50 upita/dan, 9.99€/mj
  PRO         // 250 upita/dan, 19.99€/mj
  ENTERPRISE  // 2000 upita/dan, 49.99€/mj
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
// MASTER ADMIN
// =====================================

model AdminUser {
  id           String   @id @default(cuid())
  email        String   @unique
  passwordHash String
  role         AdminRole @default(ADMIN)

  isActive     Boolean  @default(true)
  lastLoginAt  DateTime?

  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  auditLogs    AuditLog[]
}

enum AdminRole {
  SUPER_ADMIN  // Full system access
  ADMIN        // Standard admin
  VIEWER       // Read-only
}

model AuditLog {
  id          String   @id @default(cuid())
  adminId     String?

  action      String   // CREATE_USER, UPDATE_PLAN, etc.
  entityType  String   // User, Organization, etc.
  entityId    String?

  oldValue    Json?
  newValue    Json?

  ipAddress   String?
  userAgent   String?

  createdAt   DateTime @default(now())

  admin       AdminUser? @relation(fields: [adminId], references: [id])

  @@index([adminId])
  @@index([entityType, entityId])
  @@index([createdAt])
}

// =====================================
// API KEYS (Za External API Access)
// =====================================

model ApiKey {
  id             String   @id @default(cuid())
  organizationId String

  name           String
  keyHash        String   @unique // SHA-256 hash
  keyPrefix      String   // First 8 chars for identification

  scopes         String[] @default(["kpd:read"])

  lastUsedAt     DateTime?
  expiresAt      DateTime?
  isActive       Boolean  @default(true)

  createdAt      DateTime @default(now())

  @@index([keyHash])
  @@index([organizationId])
}
```

---

## 💰 STRIPE PAKETI

### Produkti u Stripe (Test Mode) ✅:

| Produkt | Product ID | Status |
|---------|------------|--------|
| KPD Basic | prod_TaqTTQSKzmLsTn | ✅ Aktivan |
| KPD Pro | prod_TaqTiCcWnV9xGp | ✅ Aktivan |
| KPD Enterprise | prod_TaqTFFIba5LAja | ✅ Aktivan |

### Potrebne Recurring Cijene:

| Plan | Cijena/mj | Upiti/dan | Članovi | Features | Price ID |
|------|-----------|-----------|---------|----------|----------|
| **FREE** | 0€ | 5 | 1 | Osnovna pretraga | N/A (besplatno) |
| **BASIC** | 9.99€ | 50 | 3 | + AI prijedlozi, History | ⏳ Kreirati |
| **PRO** | 19.99€ | 250 | 10 | + Batch upload, Export | ⏳ Kreirati |
| **ENTERPRISE** | 49.99€ | 2000 | Unlimited | + API pristup, Priority | ⏳ Kreirati |

### 🔧 Kreiranje Recurring Prices (Manual - Stripe Dashboard):

1. Otvori: https://dashboard.stripe.com/test/products
2. Za svaki produkt (Basic, Pro, Enterprise):
   - Klikni produkt → "Add another price"
   - **Pricing model**: Standard
   - **Price**: 9.99 / 19.99 / 49.99 EUR
   - **Billing period**: Monthly
   - **Save**
3. Kopiraj nove `price_xxx` ID-ove u `.env`:
   ```env
   STRIPE_PRICE_BASIC_MONTHLY=price_xxx
   STRIPE_PRICE_PRO_MONTHLY=price_xxx
   STRIPE_PRICE_ENTERPRISE_MONTHLY=price_xxx
   ```
4. Ažuriraj PlanConfig tablicu u bazi

### Stripe Webhook Endpoint:
```
URL: https://kpd.2klika.hr/api/webhooks/stripe
Events:
  - customer.subscription.created
  - customer.subscription.updated
  - customer.subscription.deleted
  - invoice.payment_succeeded
  - invoice.payment_failed
```

---

## 🔐 API KLJUČEVI (Sačuvani)

### Iz postojećeg KPD .env:

```env
# Database
POSTGRES_USER=kpd
POSTGRES_PASSWORD=kpd_secure_2025_prod
POSTGRES_DB=kpd
DATABASE_URL=postgresql://kpd:kpd_secure_2025_prod@postgres:5432/kpd?schema=public

# Redis
REDIS_URL=redis://redis:6379

# Gemini AI
GEMINI_API_KEY=AIzaSyBUw_zi1Z1foSzKOkyEPhSv_ZE5lHQXeAU

# JWT
JWT_SECRET=vFFW3bk36ijLzmZfw8eCTDj++q9+OL7l3xVjeFkKNDSllrAe0xEGOOreqYzqzX5x

# Security
API_KEY_SALT=0248ba755c1a8449a8a42bba3d41bbcd
SESSION_SECRET=e669240f11a8a30882b6971c472c0c568932c4bcb96f9482f250eecad409c6ba

# Stripe Prices (postojeći - one-time, treba recreate kao recurring)
STRIPE_PRICE_STARTER=price_1SdemMKFcGpdxTuIO6llIcPb
STRIPE_PRICE_PRO=price_1SdemMKFcGpdxTuICJ12Wu0D
STRIPE_PRICE_BUSINESS=price_1SdemNKFcGpdxTuIEyEZZQdU

# Ports
WEB_PORT=13620
API_PORT=13621
ADMIN_PORT=13624
PGBOUNCER_PORT=13622
```

### SMTP (Koristi Plesk Mail Server):
```env
# Plesk mail server - isti kao FiskalAI
SMTP_HOST=mail.2klika.hr
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=kpd@2klika.hr          # TODO: Kreirati u Plesk-u
SMTP_PASS=<generirati_password>   # TODO: Postaviti u Plesk-u
SMTP_FROM=noreply@kpd.2klika.hr
```

**NAPOMENA**: Kreirati email account `kpd@2klika.hr` u Plesk Mail panelu.

---

## 📱 USER FLOW

### 1. Registracija Novog Korisnika:
```
1. Korisnik otvara https://kpd.2klika.hr/register
2. Unosi email + password
3. Backend kreira:
   - User record
   - Organization (default: "User's Workspace")
   - OrganizationMember (role: OWNER)
   - Subscription (plan: FREE)
   - UsageRecord za tekući period
4. Šalje verification email
5. Redirect na /dashboard
```

### 2. Invite Member Flow:
```
1. Admin/Owner otvara Settings > Members
2. Klikne "Invite Member"
3. Unosi email
4. Backend kreira:
   - Invitation record (token, 7 dana expiry)
   - Šalje email s linkom
5. Pozvani korisnik:
   - Klikne link u emailu
   - Kreira password (ako novi user)
   - Automatski pridružen workspaceu
```

### 3. Upgrade Plan Flow:
```
1. Korisnik klikne "Nadogradi paket"
2. Prikazuje se pricing page
3. Odabire plan
4. Stripe Checkout (hosted)
5. Webhook ažurira Subscription
6. Limiti se automatski mijenjaju
```

### 4. KPD Query Flow:
```
1. Korisnik unosi naziv artikla
2. Frontend provjerava:
   - UsageRecord.queryCount < Subscription.dailyQueryLimit
3. Ako ima kvotu:
   - POST /api/kpd/suggest
   - AI vraća prijedloge
   - Inkrementira UsageRecord.queryCount
4. Ako nema kvote:
   - Modal: "Iskoristili ste dnevni limit. Nadogradite paket!"
```

---

## 🖥️ STRANICE / RUTE

### Public Routes:
| Ruta | Opis |
|------|------|
| `/` | Landing page |
| `/login` | Login forma |
| `/register` | Registracija |
| `/pricing` | Pricing page |
| `/invite/[token]` | Accept invitation |
| `/forgot-password` | Reset password |

### Protected Routes (Authenticated):
| Ruta | Opis |
|------|------|
| `/dashboard` | Main app + KPD tool |
| `/history` | Query history |
| `/settings/profile` | User profile |
| `/settings/workspace` | Workspace settings |
| `/settings/members` | Team members |
| `/settings/billing` | Billing & subscription |
| `/settings/api-keys` | API keys (Pro+) |

### Master Admin Routes:
| Ruta | Opis |
|------|------|
| `/admin` | Admin login |
| `/admin/dashboard` | Overview stats |
| `/admin/users` | User management |
| `/admin/organizations` | Org management |
| `/admin/subscriptions` | Subscriptions |
| `/admin/kpd` | KPD codes browser |
| `/admin/ai-settings` | Gemini/RAG config |
| `/admin/system-config` | System settings |
| `/admin/audit-log` | Audit trail |

---

## 🔧 MASTER ADMIN PANEL - Funkcionalnosti

### 1. Dashboard
- Total users, organizations, active subscriptions
- Revenue (MRR) iz Stripe
- Query usage chart (daily/weekly/monthly)
- System health status

### 2. Korisnici
- Search/filter
- Columns: Name, Email, Organization, Role, Status, Last Login, Actions
- Actions: View, Impersonate, Disable, Delete

### 3. Organizacije
- Search/filter
- Columns: Name, Members count, Plan, Status, Created, Actions
- Click to see members, usage, billing history

### 4. Paketi/Subscriptions
- Plan statistics (% users per plan)
- Manual plan assignment
- Sync with Stripe

### 5. KPD Šifranik
- Tree browser (kopija iz FiskalAI)
- Search
- Import/export
- RAG rebuild button

### 6. AI/LLM Settings
- Model selector (Gemini 2.5 Flash, Pro, etc.)
- Test prompt interface
- RAG store status
- API key management (encrypted)

### 7. System Config
- All settings from SystemConfig table
- Edit inline
- Encrypted secrets (masked)

### 8. API Keys (Global)
- GEMINI_API_KEY
- STRIPE_SECRET_KEY
- SMTP credentials
- All encrypted, editable

### 9. Audit Log
- All admin actions
- Filter by admin, action, entity
- Export

---

## 📋 IMPLEMENTACIJSKE FAZE

### FAZA 0: Priprema (Trenutna)
- [x] Analiza FiskalAI KPD tool-a
- [x] Sačuvani API ključevi
- [x] Definiran database schema
- [ ] Definirati SMTP konfiguraciju
- [ ] Kreirati recurring Stripe products/prices

### FAZA 1: Fresh Start
- [ ] Backup .env i API keys
- [ ] Obrisati stari kod (osim landing page)
- [ ] Nova Prisma schema
- [ ] Prisma migrate
- [ ] Seed: PlanConfig, SystemConfig, AdminUser

### FAZA 2: Auth & Multi-tenant
- [ ] User registration + Organization auto-create
- [ ] Login/Logout
- [ ] Email verification
- [ ] Password reset
- [ ] Invite member system
- [ ] Role-based access

### FAZA 3: Subscription & Billing
- [ ] Stripe integration (recurring)
- [ ] Checkout flow
- [ ] Webhook handler
- [ ] Plan switching
- [ ] Usage tracking
- [ ] Billing portal

### FAZA 4: KPD Core App
- [ ] Kopirati komponente iz FiskalAI
- [ ] Adaptirati za multi-tenant
- [ ] Prilagoditi API endpoints
- [ ] Usage limit enforcement
- [ ] Query history

### FAZA 5: User Dashboard
- [ ] Dashboard UI
- [ ] Profile settings
- [ ] Workspace settings
- [ ] Members management
- [ ] Billing page

### FAZA 6: Master Admin Panel
- [ ] Admin auth (odvojeni JWT)
- [ ] Dashboard stats
- [ ] User/Org management
- [ ] KPD browser
- [ ] AI settings
- [ ] System config

### FAZA 7: Polish & Launch
- [ ] Email templates
- [ ] Landing page update
- [ ] SEO optimization
- [ ] Performance testing
- [ ] Security audit
- [ ] Go live

---

## 🔐 INVITE SYSTEM - Best Practices (iz SaaS Researcha)

### Email Invite Flow:
```typescript
// Invitation Token - 7 dana expiry, SHA-256 hash
// Email Format:
{
  from: `${inviter.firstName} via KPD 2klika <noreply@kpd.2klika.hr>`,
  subject: `${inviter.firstName} vas je pozvao u ${org.name}`,
  // Personal message optional
}

// Security:
- Rate limiting: max 20 pozivnica/dan po org
- Domain restriction za enterprise (samo @company.com)
- Cancel/revoke invite opcija
```

### Accept Invite Flow:
1. User klikne link → `/invite/[token]`
2. Validacija tokena (istek, status)
3. Ako postoji user s tim emailom → Join org
4. Ako ne postoji → Register forma (password only, email prefilled)
5. Auto email verification (invite = verified)

---

## 📊 RATE LIMITING (Redis-based)

### Per Plan Limits:
```typescript
const rateLimits = {
  FREE: { queriesPerDay: 5, invitesPerDay: 3 },
  BASIC: { queriesPerDay: 50, invitesPerDay: 10 },
  PRO: { queriesPerDay: 250, invitesPerDay: 50 },
  ENTERPRISE: { queriesPerDay: 2000, invitesPerDay: 'unlimited' }
};

// Redis Keys:
// kpd:usage:${orgId}:${date} → daily counter
// kpd:ratelimit:${orgId}:invite → sliding window
```

### Sliding Window Algorithm:
```typescript
import { Ratelimit } from '@upstash/ratelimit';
// ili custom Redis implementation za naš self-hosted Redis
```

---

## 📈 MASTER ADMIN DASHBOARD - Metrike

### Key Performance Indicators (KPI):
```
┌─────────────────┬─────────────────┬─────────────────┬─────────────────┐
│   MRR (€)       │   Active Orgs   │   Total Users   │   Churn Rate    │
│   €1,234.00     │      342        │     1,284       │     2.3%        │
│   +12.5% ↑      │   +23 this mo   │   Across orgs   │   -0.5% ↓       │
└─────────────────┴─────────────────┴─────────────────┴─────────────────┘
```

### Charts:
1. **Revenue Over Time** - Line chart (MRR per month)
2. **Queries Per Day** - Bar chart (usage trends)
3. **Plan Distribution** - Pie chart (% users per plan)
4. **Top Organizations** - Table (by queries, by revenue)

### Admin Actions:
- **Impersonate User** - View app as specific user
- **Manual Plan Assignment** - Override subscription
- **Force Password Reset** - Security action
- **Disable Organization** - Suspend entire org
- **Audit Log Export** - Compliance

---

## 🎨 USER DASHBOARD - Analytics

### For FREE users:
```
┌─────────────────────────────────────────────┐
│ Dnevni upiti: ████░░░░░░ 4/5               │
│                                             │
│ [Nadogradite za više upita]                │
└─────────────────────────────────────────────┘
```

### For PAID users:
```
┌─────────────────────────────────────────────┐
│ Ovaj mjesec                                │
│ ─────────────────────────────              │
│ Upiti: 847 / 7,500                         │
│ Članovi: 5 / 10                            │
│ API pozivi: 234                            │
│                                             │
│ [Usage chart - last 30 days]               │
└─────────────────────────────────────────────┘
```

---

## ⚠️ TREBA RAZRADITI / ODLUKE

| Tema | Pitanje | Status | Odluka/Preporuka |
|------|---------|--------|------------------|
| **SMTP** | Koji mail provider? | ✅ ODLUČENO | Plesk Mail Server (`mail.2klika.hr`) - kreirati `kpd@2klika.hr` |
| **Stripe Prices** | Recurring cijene | ⏳ Manual | Kreirati u Stripe Dashboard (MCP ne podržava recurring) |
| **Stripe Webhooks** | Endpoint URL | ✅ Definirano | `https://kpd.2klika.hr/api/webhooks/stripe` |
| **Google RAG** | Novi FileSearchStore | ⏳ Čeka | Koristiti `/root/tools/gemini-rag/` - store name: `kpd-codes` |
| **Email Templates** | Dizajn | ⏳ Faza 7 | React Email + Tailwind |
| **Landing Page** | Zadržati ili redizajn? | ✅ Zadržati | Postojeći je dobar, dodati pricing CTA |
| **Stripe Live** | Kada? | ⏳ Nakon testiranja | Kad sve radi u test mode |

---

## 📝 KRITIČNE SMJERNICE

1. **ZERO HARDCODING** - Sve u bazu (SystemConfig/PlanConfig)
2. **MODULARNOST** - Svaka komponenta neovisna i testabilna
3. **SIGURNOST** - Zod validacija, rate limiting, RLS, encrypted secrets
4. **PERFORMANCE** - Redis cache, proper indexing, lazy loading
5. **PREMIUM KVALITETA** - Enterprise-grade kod i UX

---

## 🛠️ NAKON SVAKOG DOCKER REBUILDA

```bash
# Obavezno očistiti ostatke!
docker image prune -f
docker builder prune -f
docker system df  # Provjera
```

---

**Sljedeći korak**: Razraditi SMTP konfiguraciju i kreirati recurring Stripe prices.

**Last Updated**: 2025-12-13
**Maintained by**: Claude Code
