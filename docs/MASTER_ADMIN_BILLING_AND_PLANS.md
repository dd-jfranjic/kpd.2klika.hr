# MASTER ADMIN BILLING AND PLANS - KPD 2klika

**Verzija**: 1.0
**Datum**: 2025-12-15
**Autor**: Claude Code
**Status**: Kompletno

---

## 1. EXECUTIVE SUMMARY

Ovaj dokument definira logiku i pravila za Master Admin u kontekstu billing-a i planova. Kljucna pravila:

1. **Master Admin ima "UNLIMITED"** - ali to NIJE isto kao "Enterprise" plan
2. **Master Admin ne placa klasifikator** - besplatno koristenje bez ogranicenja
3. **UI jasno prikazuje "Unlimited"** za Master Admina
4. **Naplata vrijedi samo za tenante/korisnike** - ne za Master Admina

---

## 2. DEFINICIJA MASTER ADMINA

### 2.1 Sto je Master Admin?

Master Admin je **administrativna uloga** u sustavu, ne korisnicka.

| Aspekt | Master Admin | Enterprise Plan |
|--------|--------------|-----------------|
| Tip | Uloga (UserRole) | Subscription plan |
| Placa | NE | DA (199 EUR/mj) |
| Limiti | Unlimited | 2500 upita/mj |
| Svrha | Administracija sustava | Premium korisnik |
| Pristup admin panelu | DA | NE |
| Oznaka u UI | "Unlimited" | "Enterprise" |

### 2.2 Kako se Identificira Master Admin

**U Bazi (User model)**:
```prisma
enum UserRole {
  MEMBER       // Obicni korisnik
  SUPER_ADMIN  // Master admin
}

model User {
  role UserRole @default(MEMBER)
  // ...
}
```

**Na Frontendu** (`auth-context.tsx`):
```typescript
const MASTER_ADMIN_EMAILS =
  (process.env.NEXT_PUBLIC_ADMIN_EMAILS || 'info@2klika.hr')
  .split(',')
  .map(e => e.trim().toLowerCase());

const isAdmin = user
  ? MASTER_ADMIN_EMAILS.includes(user.email.toLowerCase())
  : false;
```

**Na Backendu** (`AdminGuard`):
```typescript
if (dbUser.role !== UserRole.SUPER_ADMIN) {
  throw new ForbiddenException('Pristup odbijen');
}
```

---

## 3. PRAVILA NAPLATE

### 3.1 Master Admin - Besplatno Koristenje

| Pravilo | Opis | Implementacija |
|---------|------|----------------|
| Nema naplate | Master admin ne placa subscription | Ne kreira se Stripe customer |
| Nema limita | Unlimited upiti klasifikatora | Bypass usage check |
| Nema trackinga | Usage se NE broji | Skip UsageRecord creation |
| Full pristup | Sve features dostupne | No plan restrictions |

### 3.2 Tenanti/Organizacije - Naplata po Planu

| Plan | Cijena/mj | Upiti/mj | Clanovi | Stripe Price ID |
|------|-----------|----------|---------|-----------------|
| FREE | 0 EUR | 3 | 1 | - (nema) |
| PLUS | 6.99 EUR | 10 | 2 | price_1SeIevKFcGpdxTuIQF3ZyDFQ |
| PRO | 11.99 EUR | 20 | 5 | price_1SeIevKFcGpdxTuI2FmI1GFs |
| BUSINESS | 30.99 EUR | 50 | 10 | price_1SeIewKFcGpdxTuInfJyipWm |
| ENTERPRISE | 199 EUR | 2500 | Unlimited | price_1SeIewKFcGpdxTuIQNscv0j9 |

### 3.3 Razlika u Logici

```
┌─────────────────────────────────────────────────────────────┐
│                    KORISNIK KORISTI KLASIFIKATOR            │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
              ┌───────────────────────┐
              │ Je li SUPER_ADMIN?    │
              └───────────┬───────────┘
                          │
            ┌─────────────┴─────────────┐
            │                           │
            ▼                           ▼
    ┌───────────────┐          ┌───────────────┐
    │ DA            │          │ NE            │
    │ (Master Admin)│          │ (Tenant User) │
    └───────┬───────┘          └───────┬───────┘
            │                           │
            ▼                           ▼
    ┌───────────────┐          ┌───────────────┐
    │ ALLOW         │          │ Provjeri plan │
    │ - Bez limita  │          │ - Provjeri    │
    │ - Bez naplate │          │   usage limit │
    │ - Bez trackinga│         │ - Increment   │
    └───────────────┘          │   usage       │
                               │ - Moze DENY   │
                               └───────────────┘
```

---

## 4. UI PRIKAZ ZA MASTER ADMINA

### 4.1 Dashboard Header

**Trenutno stanje**: NE prikazuje jasno "Unlimited"

**Predlozeno poboljsanje**:
```
┌─────────────────────────────────────────────────────────────┐
│ [Admin ikona]  Master Admin                                 │
│                                                             │
│ Status: Unlimited                                           │
│ Uloga: Super Administrator                                  │
│                                                             │
│ [Upozorenje] Koristis sustav kao administrator.             │
│              Nema ogranicenja ni naplate.                   │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 Billing Stranica za Master Admina

**Sto treba prikazati**:

```
┌─────────────────────────────────────────────────────────────┐
│ NAPLATA                                                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ [Shield ikona]  MASTER ADMIN - UNLIMITED                    │
│                                                             │
│ Tvoj racun ima administratorski pristup.                    │
│                                                             │
│ • Neogranicen broj upita klasifikatora                     │
│ • Nema naplate za koristenje                               │
│ • Pristup svim admin funkcijama                            │
│ • Usage se ne prati                                         │
│                                                             │
│ ─────────────────────────────────────────────────────────── │
│                                                             │
│ [Info] Ovo nije "Enterprise" plan - to je administratorska  │
│        uloga bez naplate.                                   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 4.3 Admin Panel - Vidljivost Plana

**U Admin Panelu** kada Master Admin gleda tenante:

```
┌─────────────────────────────────────────────────────────────┐
│ TVRTKE / TENANTI                                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ Organizacija       Plan         Clanovi    Upiti/mj        │
│ ─────────────────────────────────────────────────────────── │
│ Acme d.o.o.        [PRO]        5/10       18/20           │
│ Beta Corp          [FREE]       1/1        2/3             │
│ Gamma Ltd          [ENTERPRISE] 45/∞       1200/2500       │
│                                                             │
│ [Ti si Master Admin - tvoj usage se ne prikazuje ovdje]    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 5. BACKEND IMPLEMENTACIJA

### 5.1 Usage Check - Bypass za Master Admina

**Lokacija**: `kpd-suggestion.service.ts`

```typescript
async checkUsageLimit(userId: string, organizationId: string): Promise<boolean> {
  // 1. Dohvati korisnika
  const user = await this.prisma.user.findUnique({
    where: { id: userId },
    select: { role: true }
  });

  // 2. Master Admin UVIJEK ima pristup
  if (user?.role === UserRole.SUPER_ADMIN) {
    return true; // Bypass all limits
  }

  // 3. Obicni korisnici - provjeri plan i usage
  const subscription = await this.prisma.subscription.findUnique({
    where: { organizationId }
  });

  // ... standardna logika provjere limita
}
```

### 5.2 Usage Increment - Skip za Master Admina

```typescript
async incrementUsage(userId: string, organizationId: string): Promise<void> {
  // 1. Provjeri je li Master Admin
  const user = await this.prisma.user.findUnique({
    where: { id: userId },
    select: { role: true }
  });

  // 2. NE BROJI usage za Master Admina
  if (user?.role === UserRole.SUPER_ADMIN) {
    return; // Skip tracking
  }

  // 3. Obicni korisnici - inkrementiraj usage
  await this.prisma.usageRecord.upsert({
    // ... standardna logika
  });
}
```

### 5.3 Billing Portal - Redirect Logic

```typescript
async getBillingPortalUrl(userId: string): Promise<string | null> {
  const user = await this.prisma.user.findUnique({
    where: { id: userId },
    select: { role: true }
  });

  // Master Admin nema billing portal
  if (user?.role === UserRole.SUPER_ADMIN) {
    return null; // No Stripe portal for admin
  }

  // Obicni korisnici - generiraj Stripe portal URL
  // ...
}
```

---

## 6. FRONTEND IMPLEMENTACIJA

### 6.1 Plan Badge Komponenta

**Nova komponenta**: `PlanBadge.tsx`

```tsx
interface PlanBadgeProps {
  plan: PlanType | 'UNLIMITED';
  isAdmin?: boolean;
}

export function PlanBadge({ plan, isAdmin }: PlanBadgeProps) {
  if (isAdmin) {
    return (
      <Badge variant="admin" className="bg-gradient-to-r from-purple-600 to-indigo-600">
        <Shield className="w-3 h-3 mr-1" />
        Unlimited
      </Badge>
    );
  }

  const planColors = {
    FREE: 'bg-gray-100 text-gray-800',
    PLUS: 'bg-green-100 text-green-800',
    PRO: 'bg-blue-100 text-blue-800',
    BUSINESS: 'bg-indigo-100 text-indigo-800',
    ENTERPRISE: 'bg-purple-100 text-purple-800',
  };

  return (
    <Badge className={planColors[plan]}>
      {plan}
    </Badge>
  );
}
```

### 6.2 Usage Display za Master Admina

```tsx
function UsageDisplay({ isAdmin, usage, limit }: UsageDisplayProps) {
  if (isAdmin) {
    return (
      <div className="flex items-center gap-2 text-purple-600">
        <Infinity className="w-4 h-4" />
        <span>Unlimited (Admin)</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span>{usage} / {limit}</span>
      <Progress value={(usage / limit) * 100} />
    </div>
  );
}
```

### 6.3 Billing Page Conditional Render

```tsx
function BillingPage() {
  const { isAdmin } = useAuth();

  if (isAdmin) {
    return <AdminBillingInfo />;
  }

  return <TenantBillingPage />;
}

function AdminBillingInfo() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-purple-600" />
          Master Admin - Unlimited
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2 text-sm text-gray-600">
          <li>• Neogranicen broj upita klasifikatora</li>
          <li>• Nema naplate za koristenje</li>
          <li>• Pristup svim admin funkcijama</li>
          <li>• Usage se ne prati</li>
        </ul>
        <Separator className="my-4" />
        <p className="text-xs text-gray-500">
          Ovo nije "Enterprise" plan - to je administratorska uloga bez naplate.
        </p>
      </CardContent>
    </Card>
  );
}
```

---

## 7. DATABASE RAZMATRANJA

### 7.1 Master Admin NEMA Subscription

Master Admin korisnik:
- **NEMA** Organization (osim ako zeli testirati kao tenant)
- **NEMA** Subscription record
- **NEMA** UsageRecord entries
- **NEMA** Stripe Customer ID

### 7.2 Ako Master Admin Zeli Testirati

Za testiranje korisnickog iskustva, Master Admin moze:

1. **Kreirati test organizaciju** s FREE planom
2. **Pridruziti se toj organizaciji** kao MEMBER
3. **Koristiti app kao obicni korisnik** (s limitima)

```sql
-- Primjer: Admin kreira test organizaciju
INSERT INTO "Organization" (id, name, slug)
VALUES ('test_org', 'Admin Test Org', 'admin-test');

INSERT INTO "Subscription" (organizationId, plan, status)
VALUES ('test_org', 'FREE', 'ACTIVE');

INSERT INTO "OrganizationMember" (organizationId, userId, role)
VALUES ('test_org', 'admin_user_id', 'OWNER');
```

### 7.3 Seed Data - Default Admin

```typescript
// seed.ts
async function seedDefaultAdmin() {
  await prisma.user.upsert({
    where: { email: 'admin@kpd.2klika.hr' },
    update: {},
    create: {
      email: 'admin@kpd.2klika.hr',
      passwordHash: await bcrypt.hash(process.env.ADMIN_PASSWORD || 'Admin123!', 12),
      firstName: 'Super',
      lastName: 'Admin',
      role: UserRole.SUPER_ADMIN,
      emailVerified: true,
      isActive: true,
    }
  });

  // NAPOMENA: NE kreiramo Organization ni Subscription za admina!
}
```

---

## 8. API RESPONSE PRILAGODBE

### 8.1 GET /api/v1/me Response

**Za Master Admina**:
```json
{
  "success": true,
  "data": {
    "id": "cuid_admin",
    "email": "admin@kpd.2klika.hr",
    "firstName": "Super",
    "lastName": "Admin",
    "role": "SUPER_ADMIN",
    "isAdmin": true,
    "plan": "UNLIMITED",
    "usage": {
      "current": null,
      "limit": null,
      "unlimited": true
    },
    "billing": {
      "hasSubscription": false,
      "canAccessPortal": false,
      "message": "Master Admin - nema naplate"
    }
  }
}
```

**Za Obicnog Korisnika**:
```json
{
  "success": true,
  "data": {
    "id": "cuid_user",
    "email": "user@example.com",
    "firstName": "Ivan",
    "lastName": "Horvat",
    "role": "MEMBER",
    "isAdmin": false,
    "plan": "PRO",
    "usage": {
      "current": 15,
      "limit": 20,
      "unlimited": false
    },
    "billing": {
      "hasSubscription": true,
      "canAccessPortal": true,
      "portalUrl": "https://billing.stripe.com/..."
    }
  }
}
```

---

## 9. SIGURNOSNA RAZMATRANJA

### 9.1 Zasto Master Admin Nema Stripe?

| Rizik | Mitigacija |
|-------|------------|
| Accidental charge | Nema Stripe customer - nema mogucnosti naplate |
| Plan confusion | UI jasno razlikuje "Unlimited" od "Enterprise" |
| Audit trail | Sve admin akcije se logiraju u AuditLog |

### 9.2 Zastita od Zlouporabe

```typescript
// AdminGuard - provjerava SVAKI admin request
if (dbUser.role !== UserRole.SUPER_ADMIN) {
  throw new ForbiddenException('Pristup odbijen');
}

// Usage service - NE omogucava "unlimited" obicnim korisnicima
if (user.role !== UserRole.SUPER_ADMIN && !subscription) {
  throw new ForbiddenException('Potrebna pretplata');
}
```

### 9.3 Audit Trail za Master Admin Akcije

Sve akcije Master Admina se logiraju:
- Koristenje klasifikatora (iako se usage ne broji)
- Promjene na tenantima
- Promjene na korisnicima
- Promjene konfiguracije

---

## 10. TESTIRANJE

### 10.1 Test Cases za Master Admina

| Test | Ocekivani Rezultat |
|------|-------------------|
| Master Admin koristi klasifikator | ALLOW, usage se NE broji |
| Master Admin pristupa admin panelu | ALLOW |
| Master Admin nema Stripe portal | Portal URL = null |
| UI prikazuje "Unlimited" za admina | Badge pokazuje "Unlimited" |
| Usage widget za admina | Pokazuje "∞" ili "Unlimited" |

### 10.2 Test Cases za Tenante

| Test | Ocekivani Rezultat |
|------|-------------------|
| FREE plan koristi klasifikator (4. upit) | DENY - limit 3 |
| PRO plan koristi klasifikator (21. upit) | DENY - limit 20 |
| Enterprise koristi klasifikator (2501. upit) | DENY - limit 2500 |
| Tenant pristupa admin panelu | DENY - 403 Forbidden |

---

## 11. MIGRACIJA / IMPLEMENTACIJA

### 11.1 Koraci za Implementaciju

1. **Backend**: Dodaj bypass u usage check
2. **Backend**: Dodaj skip u usage increment
3. **Backend**: Prilagodi /api/v1/me response
4. **Frontend**: Kreiraj PlanBadge komponentu
5. **Frontend**: Prilagodi Billing stranicu
6. **Frontend**: Dodaj UsageDisplay za admina
7. **Test**: Provjeri sve scenarije
8. **Deploy**: Stage > Production

### 11.2 Rollback Plan

Ako nesto krene po zlu:
1. Revert na prethodnu verziju koda
2. Master Admin ce imati default ponasanje
3. Nema impact na tenante/korisnike

---

## 12. CHECKLIST

### Implementacija Checklist

- [ ] Backend: `checkUsageLimit()` bypass za SUPER_ADMIN
- [ ] Backend: `incrementUsage()` skip za SUPER_ADMIN
- [ ] Backend: `/api/v1/me` prilagodjeni response
- [ ] Frontend: `PlanBadge` komponenta s "Unlimited"
- [ ] Frontend: `BillingPage` conditional render
- [ ] Frontend: `UsageDisplay` s infinity za admina
- [ ] UI: Header prikazuje "Master Admin - Unlimited"
- [ ] Test: Manual test svih scenarija
- [ ] Docs: Azuriraj MASTER_PLAN.md

### Verifikacija Checklist

- [ ] Master Admin moze koristiti klasifikator bez limita
- [ ] Master Admin NE vidi Stripe billing portal
- [ ] Master Admin vidi "Unlimited" badge u UI
- [ ] Usage se NE broji za Master Admin upite
- [ ] Obicni korisnici i dalje imaju limite
- [ ] Audit log biljezi admin aktivnosti

---

**Dokument Generiran**: 2025-12-15
**Verificirano**: Analiza poslovnih pravila i koda
**Status**: Spreman za implementaciju
