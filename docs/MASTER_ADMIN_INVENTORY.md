# MASTER ADMIN INVENTORY - KPD 2klika

**Verzija**: 1.0
**Datum**: 2025-12-15
**Autor**: Claude Code
**Status**: Kompletno

---

## 1. EXECUTIVE SUMMARY

Master admin panel KPD aplikacije sastoji se od **7 glavnih stranica** s kompletnom funkcionalnošću za upravljanje multi-tenant SaaS platformom. Panel koristi role-based pristup gdje samo korisnici s `UserRole.SUPER_ADMIN` imaju pristup.

### Pregled Stranica

| # | Stranica | Ruta | Svrha | Status |
|---|----------|------|-------|--------|
| 1 | Korisnici | `/admin/users` | CRUD korisnika, suspenzija, role management | Implementirano |
| 2 | Tvrtke/Tenanti | `/admin/tenants` | Upravljanje organizacijama i planovima | Implementirano |
| 3 | KPD Sifrarnik | `/admin/kpd-codes` | Pregled i uredivanje KPD kodova | Implementirano |
| 4 | Konfiguracija | `/admin/config` | System config i feature flagovi | Implementirano |
| 5 | Integracije | `/admin/integrations` | API kljucevi vanjskih servisa | Implementirano |
| 6 | Audit Logovi | `/admin/audit` | Revizijski trail svih akcija | Implementirano |
| 7 | Analitika | `/admin/analytics` | KPIs, statistike, grafovi | Implementirano |

---

## 2. NAVIGACIJA I LAYOUT

### 2.1 Admin Sidebar Struktura

**Lokacija**: `/apps/web/components/admin-sidebar.tsx`

```
Sekcija: Aplikacija
├── AI Klasifikator (/classify)      [Sparkles ikona]
├── Povijest (/history)               [History ikona]
└── Statistika (/dashboard)           [BarChart3 ikona]

Sekcija: Korisnicki racun
├── Naplata (/settings/billing)       [CreditCard ikona]
├── API kljucevi (/settings/api-keys) [Key ikona]
└── Postavke (/settings)              [Settings ikona]

Sekcija: Administracija
├── Korisnici (/admin/users)          [Users ikona]
├── Tvrtke/Tenanti (/admin/tenants)   [Building2 ikona]
├── KPD Sifrarnik (/admin/kpd-codes)  [BookOpen ikona]
├── Integracije (/admin/integrations) [Plug ikona]
├── Konfiguracija (/admin/config)     [Settings ikona]
├── Audit Logovi (/admin/audit)       [FileText ikona]
└── Analitika (/admin/analytics)      [BarChart3 ikona]
```

### 2.2 Layout Komponenta

**Lokacija**: `/apps/web/components/dashboard-layout.tsx`

- **Admin Layout**: Fixed sidebar (w-64), top bar (h-16)
- **User Layout**: Responsive sa hamburger menu
- **User Dropdown**: Prikazuje "Admin" ili firstName, Settings link, Logout

---

## 3. DETALJNI INVENTAR PO STRANICI

---

### 3.1 KORISNICI (/admin/users)

**Lokacija**: `/apps/web/app/admin/users/page.tsx`

#### Svrha
Centralno upravljanje svim korisnicima sustava - pregled, suspenzija, promjena uloga.

#### UI Komponente

| Komponenta | Tip | Opis |
|------------|-----|------|
| Header | Text | "Korisnici" + ukupan broj |
| Search Box | Input | Pretraga po emailu ili imenu |
| Users Table | Table | Paginirana lista korisnika |
| Action Menu | DropdownMenu | Per-user akcije |
| Pagination | Buttons | Prethodna/Sljedeca |

#### Tablica Stupci

| Stupac | Podaci | Format |
|--------|--------|--------|
| Korisnik | firstName + lastName, email | Text + muted email |
| Uloga | role | Badge (SUPER_ADMIN=purple, ADMIN=blue, MEMBER=gray) |
| Status | isActive | Badge (Aktivan=green, Suspendiran=red) |
| Upiti | _count.queries | Number |
| Registriran | createdAt | hr-HR date format |
| Akcije | - | MoreVertical menu |

#### Akcije (MoreVertical Menu)

| Akcija | Uvjet | API Poziv |
|--------|-------|-----------|
| Aktiviraj korisnika | suspended=true | POST `/admin/users/:id/suspend` {suspended: false} |
| Suspendiraj korisnika | suspended=false | POST `/admin/users/:id/suspend` {suspended: true} |
| Postavi kao MEMBER | role !== MEMBER | PATCH `/admin/users/:id` {role: "MEMBER"} |
| Postavi kao SUPER_ADMIN | role !== SUPER_ADMIN | PATCH `/admin/users/:id` {role: "SUPER_ADMIN"} |

#### State Management

```typescript
interface State {
  users: User[];
  loading: boolean;
  search: string;
  page: number;
  totalPages: number;
  total: number;
  actionUserId: string | null;
}
```

#### API Endpoints

| Metoda | Endpoint | Parametri | Response |
|--------|----------|-----------|----------|
| GET | `/api/v1/admin/users` | page, limit(20), search | {users[], pagination} |
| PATCH | `/api/v1/admin/users/:id` | - | {user} |
| POST | `/api/v1/admin/users/:id/suspend` | - | {user} |

#### Audit Log Akcije
- `UPDATE_USER` - promjena role
- `SUSPEND_USER` - suspenzija
- `ACTIVATE_USER` - aktivacija

#### Permissions
- **Frontend**: useAuth() + isAdmin check
- **Backend**: JwtAuthGuard + AdminGuard (SUPER_ADMIN required)

#### Edge Cases
- Ne moze suspendirati samog sebe
- Ne moze promijeniti vlastitu ulogu
- Paginacija: 20 po stranici

#### Rizici
- Suspenzija aktivnog korisnika prekida njegove sesije
- Promjena role na SUPER_ADMIN daje full admin pristup

---

### 3.2 TVRTKE/TENANTI (/admin/tenants)

**Lokacija**: `/apps/web/app/admin/tenants/page.tsx`

#### Svrha
Upravljanje organizacijama - pregled, promjena planova, uvid u clanstvo.

#### UI Komponente

| Komponenta | Tip | Opis |
|------------|-----|------|
| Header | Text | "Tvrtke / Tenanti" + ukupan broj |
| Search Box | Input | Pretraga po nazivu |
| Tenants Table | Table | Paginirana lista organizacija |
| Plan Selector | DropdownMenu | Promjena plana |

#### Tablica Stupci

| Stupac | Podaci | Format |
|--------|--------|--------|
| Organizacija | name, slug | Building2 ikona + text |
| Plan | subscription.plan | Badge (colors per plan) |
| Clanovi | memberCount | Users ikona + number |
| Upiti | monthlyUsage | Number (mjesecni) |
| Kreirana | createdAt | hr-HR date format |
| Akcije | - | MoreVertical menu |

#### Plan Boje

| Plan | Badge Style |
|------|-------------|
| ENTERPRISE | bg-purple-100 text-purple-800 |
| PRO | bg-blue-100 text-blue-800 |
| BASIC | bg-green-100 text-green-800 |
| FREE | bg-gray-100 text-gray-800 |

#### Akcije

| Akcija | Opis | API |
|--------|------|-----|
| Promijeni plan | Dropdown sa FREE/BASIC/PRO/ENTERPRISE | PATCH `/admin/tenants/:id` |

#### State Management

```typescript
interface State {
  tenants: Tenant[];
  loading: boolean;
  search: string;
  page: number;
  totalPages: number;
  total: number;
  actionTenantId: string | null;
}
```

#### API Endpoints

| Metoda | Endpoint | Body | Response |
|--------|----------|------|----------|
| GET | `/api/v1/admin/tenants` | - | {tenants[], totalCount} |
| PATCH | `/api/v1/admin/tenants/:id` | {plan, status} | {tenant} |

#### Audit Log Akcije
- `UPDATE_TENANT` - promjena plana ili statusa

#### Podaci Koji se Prikazuju
- **Iz Organization**: id, name, slug, createdAt
- **Iz Subscription**: plan, status
- **Izracunato**: memberCount (_count.members), monthlyUsage

#### Edge Cases
- Downgrade plana ne resetira usage
- Enterprise plan nema limit
- Status moze biti: ACTIVE, PAST_DUE, CANCELLED, TRIALING, PAUSED

#### Rizici
- Promjena na FREE plan moze prekinuti pristup ako imaju vise clanova od limita
- Nema potvrde prije promjene plana

---

### 3.3 KPD SIFRARNIK (/admin/kpd-codes)

**Lokacija**: `/apps/web/app/admin/kpd-codes/page.tsx`

#### Svrha
Pregled i uredivanje KPD kodova (5,701 kodova - KPD 2025 standard).

#### UI Komponente

| Komponenta | Tip | Opis |
|------------|-----|------|
| Header | Text | "KPD Sifrarnik" + ukupan broj |
| Search Box | Input | Pretraga po kodu ili nazivu |
| KPD Table | Table | Paginirana lista kodova |
| Edit Mode | Inline | Uredivanje opisa |

#### Tablica Stupci

| Stupac | Podaci | Format |
|--------|--------|--------|
| Kod | code | BookOpen ikona + monospace |
| Naziv | name | Truncated text |
| Razina | level | Badge (1-5, different colors) |
| Opis | description | Editable text |
| Akcije | - | Edit/Save/Cancel |

#### Razina Boje

| Razina | Badge Style |
|--------|-------------|
| 1 | bg-blue-100 text-blue-800 |
| 2 | bg-green-100 text-green-800 |
| 3 | bg-yellow-100 text-yellow-800 |
| 4 | bg-orange-100 text-orange-800 |
| 5 | bg-red-100 text-red-800 |

#### Edit Mode Flow
1. Klik na Edit ikonu
2. Polje postaje text input
3. Check = spremi, X = odustani
4. PATCH request na API
5. Audit log se kreira

#### State Management

```typescript
interface State {
  codes: KpdCode[];
  loading: boolean;
  search: string;
  page: number;
  totalPages: number;
  total: number;
  editingId: string | null;
  editValue: string;
}
```

#### API Endpoints

| Metoda | Endpoint | Body | Response |
|--------|----------|------|----------|
| GET | `/api/v1/admin/kpd-codes` | - | {codes[], total, totalPages} |
| PATCH | `/api/v1/admin/kpd-codes/:id` | {description} | {code} |

#### Audit Log Akcije
- `UPDATE_KPD_CODE` - promjena opisa

#### Podaci u Bazi (KpdCode model)
- id (format: XX.XX.XX)
- code, name, description
- level (1-6), parentId
- codeNumeric (za sortiranje)
- isFinal, isActive, version

#### Edge Cases
- Samo opis je editabilan (code i name su read-only)
- Limit 50 po stranici
- Search je case-insensitive

#### Rizici
- Promjena opisa utjece na AI sugestije (RAG koristi name+description)
- Nema verzioniranja promjena (samo audit log)

---

### 3.4 KONFIGURACIJA (/admin/config)

**Lokacija**: `/apps/web/app/admin/config/page.tsx`

#### Svrha
Upravljanje sistemskim postavkama i feature flagovima bez redeploya.

#### UI Sekcije

**1. Feature Flagovi**
- Toggle switch za svaki flag
- Opis ispod naziva
- Loading state tijekom spremanja

**2. System Configuration (grupirano po kategoriji)**
- Input polje za svaku vrijednost
- Spremi gumb per config

#### Feature Flagovi (Whitelist)

| Flag | Opis | Default |
|------|------|---------|
| AI_SUGGESTIONS | AI prijedlozi u klasifikatoru | true |
| MAINTENANCE_MODE | Maintenance mode | false |
| NEW_PRICING | Novi pricing (beta) | false |
| BETA_FEATURES | Beta features | false |

#### Config Kljucevi (Whitelist)

| Kljuc | Kategorija | Tip |
|-------|------------|-----|
| MAINTENANCE_MODE | general | BOOLEAN |
| LOG_LEVEL | general | STRING |
| MAX_REQUESTS_PER_MINUTE | rate_limit | NUMBER |
| AI_ENABLED | ai | BOOLEAN |
| AI_MODEL | ai | STRING |
| AI_TEMPERATURE | ai | NUMBER |
| SUPPORT_EMAIL | contact | STRING |
| TERMS_URL | legal | STRING |
| PRIVACY_URL | legal | STRING |

#### SECURITY - Zabranjeni Kljucevi
Sljedeci kljucevi **NISU** na whitelist-u i ne mogu se mijenjati kroz admin panel:
- STRIPE_SECRET_KEY
- DATABASE_URL
- JWT_SECRET
- GEMINI_API_KEY
- Bilo koji secret

#### State Management

```typescript
interface State {
  configs: ConfigItem[];
  featureFlags: FeatureFlag[];
  loading: boolean;
  saving: string | null;
  editValues: Record<string, string>;
}
```

#### API Endpoints

| Metoda | Endpoint | Body | Response |
|--------|----------|------|----------|
| GET | `/api/v1/admin/config` | - | {configs[]} |
| PATCH | `/api/v1/admin/config/:key` | {value} | {config} |
| GET | `/api/v1/admin/feature-flags` | - | {flags[]} |
| PATCH | `/api/v1/admin/feature-flags/:key` | {enabled} | {flag} |

#### Audit Log Akcije
- `UPDATE_CONFIG` - promjena konfiguracije
- `ENABLE_FEATURE` - ukljucivanje flaga
- `DISABLE_FEATURE` - iskljucivanje flaga

#### Edge Cases
- Whitelist validacija na backendu
- BadRequestException ako key nije dozvoljen
- MaxLength(10000) za value

#### Rizici
- MAINTENANCE_MODE moze blokirati sve korisnike
- AI_ENABLED=false iskljucuje klasifikator
- Nema rollback mehanizma

---

### 3.5 INTEGRACIJE (/admin/integrations)

**Lokacija**: `/apps/web/app/admin/integrations/page.tsx`

#### Svrha
Upravljanje API kljucevima i vanjskim servisima (Stripe, Gemini, SMTP).

#### UI Komponente

| Komponenta | Tip | Opis |
|------------|-----|------|
| Stats Cards | 3 kartice | Konfigurirano/Nedostaje/Opcionalno |
| Webhook URLs | Info box | Stripe webhook URL |
| Integration List | Cards | Per-integration config |

#### Stats Summary

| Kartica | Ikona | Boja |
|---------|-------|------|
| Konfigurirano | CheckCircle | Zelena |
| Nedostaje | XCircle | Crvena |
| Opcionalno | Plug | Siva |

#### Integracije (Whitelist)

| Kljuc | Naziv | Required |
|-------|-------|----------|
| STRIPE_WEBHOOK_URL | Stripe Webhook URL | No |
| GEMINI_MODEL | Gemini Model | Yes |
| SMTP_FROM_NAME | SMTP From Name | No |
| SMTP_FROM_EMAIL | SMTP From Email | No |

#### Password Input
- Eye/EyeOff toggle za show/hide vrijednosti
- Masked prikaz: "••••••••"
- Full value samo kada se editira

#### State Management

```typescript
interface State {
  integrations: Integration[];
  stats: IntegrationStats;
  webhookUrls: { stripe: string };
  loading: boolean;
  saving: string | null;
  editValues: Record<string, string>;
  showValues: Record<string, boolean>;
}
```

#### API Endpoints

| Metoda | Endpoint | Body | Response |
|--------|----------|------|----------|
| GET | `/api/v1/admin/integrations` | - | {configs[], stats, webhookUrls} |
| PATCH | `/api/v1/admin/integrations/:key` | {value} | {integration} |

#### Audit Log Akcije
- `UPDATE_INTEGRATION` - vrijednost se maskira u logu ("***")

#### Edge Cases
- Stripe webhook URL se automatski generira
- GEMINI_MODEL je obavezan za klasifikator
- Validacija na backendu (whitelist)

#### Rizici
- Pogresan GEMINI_MODEL moze slomiti klasifikator
- SMTP config potreban za email notifikacije
- Audit log maskira secret vrijednosti

---

### 3.6 AUDIT LOGOVI (/admin/audit)

**Lokacija**: `/apps/web/app/admin/audit/page.tsx`

#### Svrha
Prikaz svih administrativnih akcija za sigurnost i compliance.

#### UI Komponente

| Komponenta | Tip | Opis |
|------------|-----|------|
| Header | Text | "Audit Logovi" + ukupan broj |
| Filters | 4 polja | Search, Action, DateFrom, DateTo |
| Audit Table | Table | Paginirana lista logova |

#### Filter Opcije

| Filter | Tip | Opcije |
|--------|-----|--------|
| Search | Input | Freetext pretraga |
| Action | Select | Sve akcije, UPDATE_USER, SUSPEND_USER, ... |
| Date From | Date | YYYY-MM-DD |
| Date To | Date | YYYY-MM-DD |

#### Tablica Stupci

| Stupac | Podaci | Format |
|--------|--------|--------|
| Vrijeme | createdAt | hr-HR datetime |
| Korisnik | user.email ili userId | User ikona + text |
| Akcija | action | Colored badge |
| Entitet | entityType + entityId | Type + first 8 chars |
| IP Adresa | ipAddress | Monospace |

#### Akcija Boje

| Akcija | Badge Style |
|--------|-------------|
| UPDATE_USER | bg-blue-100 text-blue-800 |
| SUSPEND_USER | bg-red-100 text-red-800 |
| ACTIVATE_USER | bg-green-100 text-green-800 |
| UPDATE_TENANT | bg-purple-100 text-purple-800 |
| UPDATE_CONFIG | bg-yellow-100 text-yellow-800 |
| UPDATE_KPD_CODE | bg-orange-100 text-orange-800 |
| ENABLE_FEATURE | bg-green-100 text-green-800 |
| DISABLE_FEATURE | bg-red-100 text-red-800 |
| UPDATE_INTEGRATION | bg-indigo-100 text-indigo-800 |

#### State Management

```typescript
interface State {
  logs: AuditLog[];
  loading: boolean;
  search: string;
  actionFilter: string;
  dateFrom: string;
  dateTo: string;
  page: number;
  totalPages: number;
  total: number;
}
```

#### API Endpoints

| Metoda | Endpoint | Parametri | Response |
|--------|----------|-----------|----------|
| GET | `/api/v1/admin/audit-logs` | page, limit(50), search, action, dateFrom, dateTo | {logs[], total, totalPages} |

#### Podaci u AuditLog Modelu
- id, userId, action
- entityType, entityId
- oldValue (JSON), newValue (JSON)
- ipAddress, userAgent
- createdAt

#### Edge Cases
- Limit 50 po stranici
- Date range filter je inclusive
- Secret vrijednosti su maskirane u newValue

#### Rizici
- Audit logovi se ne brisu (compliance requirement)
- Nema export funkcionalnosti
- Nema real-time updates

---

### 3.7 ANALITIKA (/admin/analytics)

**Lokacija**: `/apps/web/app/admin/analytics/page.tsx`

#### Svrha
Detaljni prikaz koristenja sustava, prihoda, performansi i trendova.

#### UI Komponente

| Komponenta | Tip | Opis |
|------------|-----|------|
| Header | Text + Select | "Analitika" + period selector |
| Stats Cards | 4 kartice | Revenue, Classifications, Users, Response Time |
| Charts | 2 stupca | Bar chart + Progress bars |
| Performance Grid | 4 stupca | Detailed metrics |
| Top KPD Table | Table | Najcesci kodovi |

#### Period Selector Opcije

| Vrijednost | Label |
|------------|-------|
| 7d | Zadnjih 7 dana |
| 30d | Zadnjih 30 dana |
| 90d | Zadnjih 90 dana |
| 1y | Zadnjih godinu dana |

#### Stats Cards

| Kartica | Ikona | Boja | Metrika |
|---------|-------|------|---------|
| Mjesecni prihod | DollarSign | Zelena | revenue.total EUR |
| Ukupno klasifikacija | SearchIcon | Plava | classifications.total |
| Novi korisnici | Users | Purple | users.new |
| Prosjecno vrijeme | Zap | Narancasta | performance.avgResponseTime ms |

#### Grafovi

**1. Klasifikacije po danima (Bar Chart)**
- X-axis: datum
- Y-axis: broj upita
- Tooltip: "{queries} upita"

**2. Distribucija po planovima (Progress Bars)**
- Enterprise = purple
- Business = indigo
- Pro = blue
- Plus = green
- Free = gray

#### Performance Metrics

| Metrika | Opis | Jedinica |
|---------|------|----------|
| Prosjecno vrijeme | avgResponseTime | ms |
| P95 latencija | p95Latency | ms |
| Cache hit rate | cacheHitRate | % |
| Uptime | uptime | % |

#### Top KPD Codes Tablica

| Stupac | Opis |
|--------|------|
| # | Rang |
| Kod | KPD sifra |
| Broj upita | count |

#### State Management

```typescript
interface State {
  analytics: Analytics | null;
  loading: boolean;
  period: '7d' | '30d' | '90d' | '1y';
}

interface Analytics {
  revenue: { total: number; change: number };
  classifications: { total: number; change: number };
  users: { new: number; change: number };
  performance: {
    avgResponseTime: number;
    cacheHitRate: number;
    uptime: number;
    errorRate: number;
    p95Latency: number;
  };
  usageHistory: Array<{ date: string; queries: number; cached: number }>;
  planDistribution: Array<{ name: string; value: number }>;
  topKpdCodes: Array<{ code: string; count: number }>;
}
```

#### API Endpoints

| Metoda | Endpoint | Parametri | Response |
|--------|----------|-----------|----------|
| GET | `/api/v1/admin/analytics` | period | {analytics} |

#### Poznati TODOs (iz koda)
- [ ] Calculate change from previous period
- [ ] Get cache hit rate from Redis
- [ ] Get average response time from query latency

#### Edge Cases
- Period "1y" moze imati puno podataka
- Revenue je 0 ako nema placenih pretplata
- Cache hit rate je placeholder (TODO)

#### Rizici
- Performance metriki su djelomicno placeholder
- Nema export/download opcije
- Nema alerting na anomalije

---

## 4. AUTENTIFIKACIJA I AUTORIZACIJA

### 4.1 Master Admin Detekcija

**Frontend** (`/apps/web/contexts/auth-context.tsx`):
```typescript
const MASTER_ADMIN_EMAILS =
  (process.env.NEXT_PUBLIC_ADMIN_EMAILS || 'info@2klika.hr')
  .split(',')
  .map(e => e.trim().toLowerCase());

const isAdmin = user
  ? MASTER_ADMIN_EMAILS.includes(user.email.toLowerCase())
  : false;
```

**Backend** (`/apps/api/src/modules/admin/admin.guard.ts`):
```typescript
if (dbUser.role !== UserRole.SUPER_ADMIN) {
  throw new ForbiddenException('Pristup odbijen - potrebna SUPER_ADMIN ovlast');
}
```

### 4.2 JWT Token

- **Storage**: localStorage (`kpd_auth_token`) + cookie
- **Expiry**: Access token 15 min, Refresh token 7 dana
- **Header**: `Authorization: Bearer {token}`

### 4.3 Guards na Svim Admin Rutama

```typescript
@UseGuards(JwtAuthGuard, AdminGuard)
@ApiBearerAuth()
export class AdminController { ... }
```

---

## 5. DATABASE MODELI (Relevantni za Admin)

### 5.1 User

```prisma
model User {
  id            String   @id
  email         String   @unique
  role          UserRole @default(MEMBER)  // MEMBER | SUPER_ADMIN
  isActive      Boolean  @default(true)
  emailVerified Boolean  @default(false)
  // ... ostala polja
}
```

### 5.2 AuditLog

```prisma
model AuditLog {
  id          String   @id
  userId      String?
  action      String
  entityType  String
  entityId    String?
  oldValue    Json?
  newValue    Json?
  ipAddress   String?
  userAgent   String?
  createdAt   DateTime @default(now())
}
```

### 5.3 SystemConfig

```prisma
model SystemConfig {
  id          String   @id
  key         String   @unique
  value       String
  type        ConfigType  // STRING | NUMBER | BOOLEAN | JSON | SECRET
  category    String
  description String?
  isSecret    Boolean @default(false)
}
```

---

## 6. SIGURNOSNE MJERE

### 6.1 Implementirano

| Mjera | Opis | Lokacija |
|-------|------|----------|
| AdminGuard | Provjera SUPER_ADMIN role | admin.guard.ts |
| Defense in Depth | Fresh DB lookup u guard-u | admin.guard.ts |
| Whitelist Config | Samo dozvoljeni kljucevi | admin.service.ts |
| Audit Logging | Sve akcije se logiraju | admin.controller.ts |
| Secret Masking | Secrets se ne prikazuju | admin.service.ts |
| Rate Limiting | Globalni throttler | app.module.ts |
| DTO Validation | Zod/class-validator | DTOs |

### 6.2 Whitelist Zastite

```typescript
ALLOWED_CONFIG_KEYS = [
  'MAINTENANCE_MODE', 'LOG_LEVEL', 'MAX_REQUESTS_PER_MINUTE',
  'AI_ENABLED', 'AI_MODEL', 'AI_TEMPERATURE',
  'SUPPORT_EMAIL', 'TERMS_URL', 'PRIVACY_URL'
]

ALLOWED_FEATURE_FLAGS = [
  'AI_SUGGESTIONS', 'MAINTENANCE_MODE', 'NEW_PRICING', 'BETA_FEATURES'
]

ALLOWED_INTEGRATION_KEYS = [
  'STRIPE_WEBHOOK_URL', 'GEMINI_MODEL', 'SMTP_FROM_NAME', 'SMTP_FROM_EMAIL'
]
```

---

## 7. OVISNOSTI

### 7.1 Environment Variables

| Varijabla | Svrha | Potrebno Za |
|-----------|-------|-------------|
| NEXT_PUBLIC_ADMIN_EMAILS | Lista admin emailova | Frontend admin check |
| ADMIN_PASSWORD | Default admin password | Seed |
| STRIPE_SECRET_KEY | Stripe API | Billing |
| GEMINI_API_KEY | Google AI | Klasifikator |
| DATABASE_URL | PostgreSQL | Sve |

### 7.2 Servisi

| Servis | Koristen Za |
|--------|-------------|
| PostgreSQL | Svi podaci |
| Redis | Cache, sessions |
| Stripe | Billing, subscriptions |
| Google Gemini | AI klasifikacija |
| SMTP | Email notifikacije |

---

## 8. POZNATI NEDOSTACI

### 8.1 Funkcionalnosti Koje Nedostaju

| Feature | Opis | Prioritet |
|---------|------|-----------|
| Dashboard landing | /admin nema landing page | P2 |
| Bulk operations | Delete/update multiple users | P2 |
| Export | CSV/Excel export za tablice | P1 |
| Real-time updates | WebSocket za live sync | P3 |
| User creation | Kreiranje novog usera iz admina | P2 |
| Modals za detalje | Detaljni pregled entiteta | P2 |

### 8.2 TODOs u Kodu

| Lokacija | TODO |
|----------|------|
| admin.service.ts | Get cache hit rate from Redis |
| admin.service.ts | Revenue growth calculation |
| admin.service.ts | Calculate change from previous period |
| admin.service.ts | Get average response time from query latency |

---

## 9. NAPOMENE

### I Don't Know (Nije Pronađeno/Verificirano)

1. **Dashboard landing page** - Postoji li `/admin` ili `/admin/dashboard`?
   - Status: I don't know - nije pronađena ruta

2. **Modalni prozori** - Ima li modal za user/tenant detalje?
   - Status: I don't know - nije pronađeno

3. **Real-time updates** - Koristi li WebSockets?
   - Status: I don't know - nije pronađeno

4. **Caching na frontendu** - React Query ili SWR?
   - Status: Koristi jednostavni fetch + useState

---

**Dokument Generiran**: 2025-12-15
**Izvor**: Analiza source koda KPD projekta
**Verificirano**: Frontend + Backend + Database schema
