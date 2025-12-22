# PLAN: Jednokratna Plaćanja i Query Booster

**Verzija**: 2.0
**Datum**: 2025-12-19
**Status**: ✅ ODOBRENO - SPREMNO ZA IMPLEMENTACIJU
**Procijenjeno vrijeme**: 8-12 sati razvoja

## ✅ STRIPE PRODUKTI KREIRANI (TEST MODE)

---

## EXECUTIVE SUMMARY

### Što se implementira:

1. **Jednokratni paketi** - Mogućnost kupnje bilo kojeg paketa (PLUS/PRO/BUSINESS/ENTERPRISE) kao jednokratnu kupnju umjesto mjesečne pretplate
2. **Prebacivanje billing tipa** - Korisnik može prijeći s jednokratnog na mjesečni i obrnuto
3. **Query Booster** - Dodatnih 10 upita za 6.99€ kada korisnik potroši kvotu

### Ključne odluke:

| Odluka | Obrazloženje |
|--------|--------------|
| Bonus upiti NE istječu | Najpravičnije za korisnika, jednostavnije za implementaciju |
| Prvo troše mjesečni, pa bonus | Logičan redoslijed - pretplata ima prednost |
| Jedna cijena za Query Booster (6.99€/10) | Jednostavnost, jednaka cijeni PLUS paketa po upitu |
| Purchase model za audit trail | Transparentnost i mogućnost refunda |

---

## 1. STRIPE KONFIGURACIJA

### 1.1 Postojeći produkti (Recurring Monthly)

| Plan | Product ID | Price ID (Monthly) | Cijena/mj | Upita/mj |
|------|------------|-------------------|-----------|----------|
| PLUS | prod_TbVLJVFaUCyHdg | price_1SeIevKFcGpdxTuIQF3ZyDFQ | 6.99€ | 10 |
| PRO | prod_TbVLnifWey72eR | price_1SeIevKFcGpdxTuI2FmI1GFs | 11.99€ | 20 |
| BUSINESS | prod_TbVLIkRZMeoKrI | price_1SeIewKFcGpdxTuInfJyipWm | 30.99€ | 50 |
| ENTERPRISE | prod_TbVLor29dXUA8N | price_1SeIewKFcGpdxTuIQNscv0j9 | 199€ | 2500 |

### 1.2 ✅ KREIRANI One-Time Produkti i Cijene

| Produkt | Product ID | Price ID (One-Time) | Cijena | Upita | Status |
|---------|------------|---------------------|--------|-------|--------|
| KPD Basic (Jednokratno) | prod_TbVLJVFaUCyHdg | **price_1Sg4qhKFcGpdxTuICyxxShAB** | 6.99€ | 10 | ✅ KREIRAN |
| KPD Pro (Jednokratno) | prod_TbVLnifWey72eR | **price_1Sg4qiKFcGpdxTuIc79FSUu8** | 11.99€ | 20 | ✅ KREIRAN |
| KPD Business (Jednokratno) | prod_TbVLIkRZMeoKrI | **price_1Sg4qiKFcGpdxTuI7CdZN63e** | 30.99€ | 50 | ✅ KREIRAN |
| KPD Enterprise (Jednokratno) | prod_TbVLor29dXUA8N | **price_1Sg4qiKFcGpdxTuIPgYeMlJa** | 199€ | 2500 | ✅ KREIRAN |
| **Query Booster** | **prod_TdLXN80Wpu51Bo** | **price_1Sg4qhKFcGpdxTuIumDZtDDK** | 6.99€ | 10 | ✅ KREIRAN |

### 1.3 Environment Variables za dodati u .env

```env
# One-Time Prices (KREIRANI - test mode)
STRIPE_PRICE_PLUS_ONETIME=price_1Sg4qhKFcGpdxTuICyxxShAB
STRIPE_PRICE_PRO_ONETIME=price_1Sg4qiKFcGpdxTuIc79FSUu8
STRIPE_PRICE_BUSINESS_ONETIME=price_1Sg4qiKFcGpdxTuI7CdZN63e
STRIPE_PRICE_ENTERPRISE_ONETIME=price_1Sg4qiKFcGpdxTuIPgYeMlJa
STRIPE_PRICE_QUERY_BOOSTER=price_1Sg4qhKFcGpdxTuIumDZtDDK
STRIPE_PRODUCT_QUERY_BOOSTER=prod_TdLXN80Wpu51Bo
```

> ⚠️ **NAPOMENA**: Ovi ID-jevi su za TEST MODE. Za produkciju trebat će kreirati iste produkte u LIVE mode.

---

## 2. DATABASE SCHEMA PROMJENE

### 2.1 Subscription Model - Nova polja

```prisma
model Subscription {
  // ... postojeća polja ...

  // NOVA POLJA:
  billingType        BillingType @default(SUBSCRIPTION)
  bonusQueryQuota    Int @default(0)    // Kupljeni bonus upiti (NE resetiraju se!)
  oneTimePlanExpiry  DateTime?          // Opcija: kad jednokratni paket istječe
}

enum BillingType {
  SUBSCRIPTION  // Mjesečna pretplata (recurring)
  ONE_TIME      // Jednokratna kupnja (bez ponavljanja)
}
```

### 2.2 Purchase Model - NOVI

```prisma
model Purchase {
  id                      String @id @default(cuid())
  organizationId          String

  // Stripe veza
  stripePaymentIntentId   String? @unique
  stripeCheckoutSessionId String?

  // Produkt info
  productType             PurchaseType
  productName             String
  priceEur                Float

  // Benefit
  queriesIncluded         Int
  queriesUsed             Int @default(0)

  // Status
  status                  PurchaseStatus @default(PENDING)
  purchasedAt             DateTime?
  expiresAt               DateTime?      // null = ne istječe nikad
  refundedAt              DateTime?
  refundReason            String?

  createdAt               DateTime @default(now())
  updatedAt               DateTime @updatedAt

  organization            Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  @@index([organizationId])
  @@index([status])
  @@index([productType])
}

enum PurchaseType {
  ONE_TIME_PLAN   // Jednokratni paket (PLUS/PRO/BUSINESS/ENTERPRISE)
  QUERY_BOOSTER   // Dodatni upiti (10 za 6.99€)
  MANUAL_GRANT    // Admin dodijelio besplatno
}

enum PurchaseStatus {
  PENDING     // Čeka plaćanje
  COMPLETED   // Plaćeno i primijenjeno
  EXPIRED     // Isteklo (ako ima expiresAt)
  REFUNDED    // Vraćen novac
}
```

### 2.3 Migracija (backward compatible!)

```sql
-- Migration: add_one_time_billing_support

-- 1. Dodaj BillingType enum
CREATE TYPE "BillingType" AS ENUM ('SUBSCRIPTION', 'ONE_TIME');

-- 2. Dodaj nova polja na Subscription (sva nullable ili default!)
ALTER TABLE "Subscription"
  ADD COLUMN "billingType" "BillingType" NOT NULL DEFAULT 'SUBSCRIPTION',
  ADD COLUMN "bonusQueryQuota" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "oneTimePlanExpiry" TIMESTAMP(3);

-- 3. Kreiraj Purchase tablicu
CREATE TABLE "Purchase" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "stripePaymentIntentId" TEXT,
  "stripeCheckoutSessionId" TEXT,
  "productType" "PurchaseType" NOT NULL,
  "productName" TEXT NOT NULL,
  "priceEur" DOUBLE PRECISION NOT NULL,
  "queriesIncluded" INTEGER NOT NULL,
  "queriesUsed" INTEGER NOT NULL DEFAULT 0,
  "status" "PurchaseStatus" NOT NULL DEFAULT 'PENDING',
  "purchasedAt" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3),
  "refundedAt" TIMESTAMP(3),
  "refundReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Purchase_pkey" PRIMARY KEY ("id")
);

-- 4. Indexi
CREATE UNIQUE INDEX "Purchase_stripePaymentIntentId_key" ON "Purchase"("stripePaymentIntentId");
CREATE INDEX "Purchase_organizationId_idx" ON "Purchase"("organizationId");
CREATE INDEX "Purchase_status_idx" ON "Purchase"("status");

-- 5. Foreign key
ALTER TABLE "Purchase" ADD CONSTRAINT "Purchase_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE;
```

---

## 3. BACKEND API PROMJENE

### 3.1 Stripe Module - Novi endpointi

| Method | Endpoint | Auth | Opis |
|--------|----------|------|------|
| POST | `/stripe/checkout/one-time` | JWT | Kreiraj one-time checkout session |
| GET | `/stripe/purchases/:orgId` | JWT | Dohvati povijest kupnji |
| POST | `/stripe/convert-to-subscription` | JWT | Prebaci s jednokratnog na mjesečni |
| POST | `/stripe/cancel-keep-bonus` | JWT | Otkaži pretplatu, zadrži bonus |

### 3.2 Stripe Service - Nove metode

**Datoteka**: `apps/api/src/modules/stripe/stripe.service.ts`

```typescript
// NOVA METODA: Kreiranje one-time checkout sessiona
async createOneTimeCheckoutSession(
  organizationId: string,
  productType: 'ONE_TIME_PLAN' | 'QUERY_BOOSTER',
  planType?: PlanType,  // Za ONE_TIME_PLAN
): Promise<{ url: string }> {
  const customerId = await this.getOrCreateCustomer(organizationId);
  const priceId = this.getOneTimePriceId(productType, planType);
  const queriesGranted = this.getQueriesForProduct(productType, planType);

  const session = await this.stripe.checkout.sessions.create({
    mode: 'payment',  // KLJUČNA RAZLIKA od subscription!
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${this.appUrl}/settings/billing?purchase=success`,
    cancel_url: `${this.appUrl}/settings/billing?purchase=canceled`,
    payment_intent_data: {
      metadata: {
        organizationId,
        productType,
        planType: planType ?? '',
        queriesGranted: queriesGranted.toString(),
      },
    },
    metadata: {
      organizationId,
      productType,
      planType: planType ?? '',
      queriesGranted: queriesGranted.toString(),
    },
  });

  // Kreiraj PENDING purchase zapis
  await this.prisma.purchase.create({
    data: {
      organizationId,
      stripeCheckoutSessionId: session.id,
      productType,
      productName: this.getProductName(productType, planType),
      priceEur: session.amount_total! / 100,
      queriesIncluded: queriesGranted,
      status: 'PENDING',
    },
  });

  return { url: session.url! };
}

// NOVA METODA: Handle successful one-time payment
async handleOneTimePaymentCompleted(session: Stripe.CheckoutSession): Promise<void> {
  const { organizationId, productType, planType, queriesGranted } = session.metadata!;
  const queries = parseInt(queriesGranted, 10);

  // 1. Ažuriraj subscription - dodaj bonus upite
  const updateData: any = {
    bonusQueryQuota: { increment: queries },
  };

  // Ako je ONE_TIME_PLAN i korisnik nema aktivnu subscription, postavi billingType
  if (productType === 'ONE_TIME_PLAN') {
    const sub = await this.prisma.subscription.findUnique({
      where: { organizationId },
    });
    if (!sub?.stripeSubscriptionId) {
      updateData.billingType = 'ONE_TIME';
      updateData.plan = planType as PlanType;
      updateData.monthlyQueryLimit = 0;  // One-time nema mjesečni limit
    }
  }

  await this.prisma.subscription.update({
    where: { organizationId },
    data: updateData,
  });

  // 2. Ažuriraj Purchase zapis
  await this.prisma.purchase.updateMany({
    where: { stripeCheckoutSessionId: session.id },
    data: {
      stripePaymentIntentId: session.payment_intent as string,
      status: 'COMPLETED',
      purchasedAt: new Date(),
    },
  });

  // 3. Audit log
  this.logger.log(`One-time purchase completed: ${queries} queries for org ${organizationId}`);
}

// NOVA METODA: Dohvat kupnji
async getPurchases(organizationId: string): Promise<Purchase[]> {
  return this.prisma.purchase.findMany({
    where: { organizationId },
    orderBy: { createdAt: 'desc' },
  });
}

// HELPER: Mapiranje productType na priceId
private getOneTimePriceId(productType: string, planType?: PlanType): string {
  if (productType === 'QUERY_BOOSTER') {
    return this.configService.get('STRIPE_PRICE_QUERY_BOOSTER')!;
  }

  const priceMap: Record<PlanType, string> = {
    PLUS: this.configService.get('STRIPE_PRICE_PLUS_ONETIME')!,
    PRO: this.configService.get('STRIPE_PRICE_PRO_ONETIME')!,
    BUSINESS: this.configService.get('STRIPE_PRICE_BUSINESS_ONETIME')!,
    ENTERPRISE: this.configService.get('STRIPE_PRICE_ENTERPRISE_ONETIME')!,
    FREE: '', // FREE nema one-time
  };

  return priceMap[planType!];
}

// HELPER: Mapiranje na broj upita
private getQueriesForProduct(productType: string, planType?: PlanType): number {
  if (productType === 'QUERY_BOOSTER') return 10;

  const queriesMap: Record<PlanType, number> = {
    FREE: 0,
    PLUS: 10,
    PRO: 20,
    BUSINESS: 50,
    ENTERPRISE: 2500,
  };

  return queriesMap[planType!] ?? 0;
}
```

### 3.3 Webhook Controller - Proširenje

**Datoteka**: `apps/api/src/modules/stripe/webhook.controller.ts`

```typescript
// Proširiti switch statement:

case 'checkout.session.completed':
  const session = event.data.object as Stripe.CheckoutSession;

  if (session.mode === 'payment') {
    // ONE-TIME PAYMENT
    await this.stripeService.handleOneTimePaymentCompleted(session);
  } else if (session.mode === 'subscription') {
    // Postojeća logika za subscription
    await this.stripeService.handleCheckoutCompleted(session);
  }
  break;

case 'charge.refunded':
  const charge = event.data.object as Stripe.Charge;
  await this.stripeService.handleRefund(charge);
  break;
```

### 3.4 KPD Suggestion Service - Usage Logic Update

**Datoteka**: `apps/api/src/modules/kpd/services/kpd-suggestion.service.ts`

```typescript
// Ažurirati checkUsageLimit() metodu:

async checkUsageLimit(organizationId: string): Promise<UsageInfo> {
  const org = await this.prisma.organization.findUnique({
    where: { id: organizationId },
    include: { subscription: true },
  });

  const subscription = org?.subscription;
  const monthlyLimit = subscription?.monthlyQueryLimit ?? 3;  // FREE default
  const bonusLimit = subscription?.bonusQueryQuota ?? 0;
  const billingType = subscription?.billingType ?? 'SUBSCRIPTION';

  // Određivanje perioda za brojanje
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const periodStart = subscription?.currentPeriodStart ?? monthStart;
  const countFromDate = periodStart > monthStart ? periodStart : monthStart;

  // Brojanje uspješnih upita
  const usedThisMonth = await this.prisma.query.count({
    where: {
      organizationId,
      createdAt: { gte: countFromDate },
      NOT: { suggestedCodes: { equals: [] } },
    },
  });

  // Kalkulacija preostalih upita
  let remainingQueries: number;
  let monthlyRemaining: number;
  let bonusRemaining: number;

  if (billingType === 'ONE_TIME' && !subscription?.stripeSubscriptionId) {
    // ONE_TIME bez aktivne subscription - koristi SAMO bonus
    remainingQueries = Math.max(0, bonusLimit - usedThisMonth);
    monthlyRemaining = 0;
    bonusRemaining = remainingQueries;
  } else {
    // SUBSCRIPTION ili mješovito - prvo mjesečni, pa bonus
    const totalLimit = monthlyLimit + bonusLimit;
    remainingQueries = Math.max(0, totalLimit - usedThisMonth);
    monthlyRemaining = Math.max(0, monthlyLimit - Math.min(usedThisMonth, monthlyLimit));
    bonusRemaining = Math.max(0, bonusLimit - Math.max(0, usedThisMonth - monthlyLimit));
  }

  return {
    usedThisMonth,
    remainingQueries,
    monthlyLimit,
    monthlyRemaining,
    bonusLimit,
    bonusRemaining,
    billingType,
    periodStart: countFromDate,
  };
}
```

### 3.5 Admin Service - Nove metode

**Datoteka**: `apps/api/src/modules/admin/admin.service.ts`

```typescript
// NOVA METODA: Dohvat svih kupnji
async getPurchases(filters: {
  status?: PurchaseStatus;
  productType?: PurchaseType;
  page?: number;
  pageSize?: number;
}): Promise<{ purchases: Purchase[]; total: number }> {
  const where: any = {};
  if (filters.status) where.status = filters.status;
  if (filters.productType) where.productType = filters.productType;

  const [purchases, total] = await Promise.all([
    this.prisma.purchase.findMany({
      where,
      include: { organization: { select: { name: true, slug: true } } },
      orderBy: { createdAt: 'desc' },
      skip: (filters.page ?? 0) * (filters.pageSize ?? 20),
      take: filters.pageSize ?? 20,
    }),
    this.prisma.purchase.count({ where }),
  ]);

  return { purchases, total };
}

// NOVA METODA: Manual grant (admin daje bonus besplatno)
async grantBonusQueries(
  organizationId: string,
  queries: number,
  reason: string,
  adminUserId: string,
): Promise<Purchase> {
  // Dodaj bonus upite
  await this.prisma.subscription.update({
    where: { organizationId },
    data: { bonusQueryQuota: { increment: queries } },
  });

  // Kreiraj Purchase zapis
  const purchase = await this.prisma.purchase.create({
    data: {
      organizationId,
      productType: 'MANUAL_GRANT',
      productName: `Admin Grant: ${queries} queries`,
      priceEur: 0,
      queriesIncluded: queries,
      status: 'COMPLETED',
      purchasedAt: new Date(),
    },
  });

  // Audit log
  await this.createAuditLog(adminUserId, 'GRANT_BONUS_QUERIES', 'Purchase', purchase.id, null, {
    organizationId,
    queries,
    reason,
  });

  return purchase;
}

// NOVA METODA: Refund kupnje
async refundPurchase(
  purchaseId: string,
  reason: string,
  adminUserId: string,
): Promise<void> {
  const purchase = await this.prisma.purchase.findUnique({
    where: { id: purchaseId },
  });

  if (!purchase) throw new NotFoundException('Purchase not found');
  if (purchase.status === 'REFUNDED') throw new BadRequestException('Already refunded');

  // Oduzmi bonus upite
  await this.prisma.subscription.update({
    where: { organizationId: purchase.organizationId },
    data: {
      bonusQueryQuota: { decrement: purchase.queriesIncluded },
    },
  });

  // Ažuriraj purchase status
  await this.prisma.purchase.update({
    where: { id: purchaseId },
    data: {
      status: 'REFUNDED',
      refundedAt: new Date(),
      refundReason: reason,
    },
  });

  // Stripe refund (ako je bilo plaćeno)
  if (purchase.stripePaymentIntentId) {
    await this.stripeService.createRefund(purchase.stripePaymentIntentId);
  }

  // Audit log
  await this.createAuditLog(adminUserId, 'REFUND_PURCHASE', 'Purchase', purchaseId, purchase, {
    reason,
  });
}
```

---

## 4. FRONTEND UI PROMJENE

### 4.1 Pricing Page - Per-Card Billing Selection (ODOBRENI DIZAJN)

**Datoteka**: `apps/web/app/pricing/page.tsx`

**VIZUALNI KONCEPT**: Svaka pricing kartica ima vlastiti tab za odabir billing tipa.

```
┌─────────────────────────────────────────┐
│              KPD PRO                     │
│           ────────────                   │
│           ⭐ Najpopularniji              │
│                                          │
│         ┌─────────┬─────────┐            │
│         │ Mjesečno│Jednokr. │  ← Tab     │
│         │    ✓    │         │    unutar  │
│         └─────────┴─────────┘    kartice │
│                                          │
│             11.99€                        │
│            /mjesečno                      │
│                                          │
│         ✓ 20 upita mjesečno              │
│         ✓ AI klasifikacija               │
│         ✓ Export rezultata               │
│                                          │
│      ┌──────────────────────┐            │
│      │   Pretplati se       │            │
│      └──────────────────────┘            │
└─────────────────────────────────────────┘

     Kada korisnik klikne "Jednokratno":

┌─────────────────────────────────────────┐
│              KPD PRO                     │
│           ────────────                   │
│           ⭐ Najpopularniji              │
│                                          │
│         ┌─────────┬─────────┐            │
│         │ Mjesečno│Jednokr. │            │
│         │         │    ✓    │  ← Aktivan │
│         └─────────┴─────────┘            │
│                                          │
│             11.99€                        │
│            jednokratno                    │
│                                          │
│         ✓ 20 upita (ne istječu!)         │  ← Tekst se mijenja
│         ✓ AI klasifikacija               │
│         ✓ Bez mjesečne obveze            │  ← Dodano
│                                          │
│      ┌──────────────────────┐            │
│      │      Kupi PRO        │  ← CTA     │
│      └──────────────────────┘            │
└─────────────────────────────────────────┘
```

**Implementacija**:

```tsx
// Komponenta PricingCard - svaka ima vlastiti billing state
function PricingCard({ plan }: { plan: Plan }) {
  const [billingType, setBillingType] = useState<'subscription' | 'one_time'>('subscription');

  // Features se prilagođavaju billing tipu
  const getFeatures = () => {
    if (billingType === 'one_time') {
      return [
        `${plan.queries} upita (ne istječu!)`,
        'AI klasifikacija KPD šifara',
        'Export rezultata',
        'Bez mjesečne obveze',
      ];
    }
    return [
      `${plan.queries} upita mjesečno`,
      'AI klasifikacija KPD šifara',
      'Export rezultata',
      'Prioritetna podrška',
    ];
  };

  return (
    <div className="kpd-pricing-card">
      <h3 className="kpd-pricing-card__name">{plan.displayName}</h3>

      {/* BILLING TYPE TABS - unutar svake kartice */}
      {plan.plan !== 'FREE' && (
        <div className="kpd-pricing-card__billing-tabs">
          <button
            className={billingType === 'subscription' ? 'active' : ''}
            onClick={() => setBillingType('subscription')}
          >
            <RefreshCw size={14} />
            Mjesečno
          </button>
          <button
            className={billingType === 'one_time' ? 'active' : ''}
            onClick={() => setBillingType('one_time')}
          >
            <ShoppingCart size={14} />
            Jednokratno
          </button>
        </div>
      )}

      {/* CIJENA */}
      <div className="kpd-pricing-card__price">
        <span className="amount">{plan.monthlyPriceEur}€</span>
        <span className="period">
          {billingType === 'subscription' ? '/mjesečno' : 'jednokratno'}
        </span>
      </div>

      {/* FEATURES */}
      <ul className="kpd-pricing-card__features">
        {getFeatures().map((feature, i) => (
          <li key={i}><Check size={16} /> {feature}</li>
        ))}
      </ul>

      {/* CTA BUTTON */}
      <button
        onClick={() => handleSelectPlan(plan, billingType)}
        className="kpd-btn kpd-btn--primary"
      >
        {billingType === 'subscription' ? 'Pretplati se' : `Kupi ${plan.displayName}`}
      </button>
    </div>
  );
}

// Handler za odabir plana
const handleSelectPlan = async (plan: Plan, billingType: 'subscription' | 'one_time') => {
  if (billingType === 'one_time') {
    const response = await fetch('/api/v1/stripe/checkout/one-time', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        organizationId: user?.organizationId,
        productType: 'ONE_TIME_PLAN',
        planType: plan.plan,
      }),
    });
    const { url } = await response.json();
    window.location.href = url;
  } else {
    // Postojeća subscription checkout logika
    // ...
  }
};
```

### 4.2 Billing Settings - Query Booster Sekcija

**Datoteka**: `apps/web/app/(dashboard)/settings/billing/page.tsx`

```tsx
// Nova sekcija nakon Current Subscription

{/* QUERY BOOSTER SECTION */}
<div className="kpd-settings-card">
  <div className="kpd-settings-card__header">
    <Zap className="kpd-settings-card__icon" />
    <h2>Dodatni upiti</h2>
  </div>

  <div className="kpd-query-booster">
    <p className="kpd-query-booster__description">
      Trebate više upita? Kupite paket od 10 dodatnih upita koji ne istječu.
    </p>

    <div className="kpd-query-booster__offer">
      <div className="kpd-query-booster__price">
        <span className="amount">6.99€</span>
        <span className="per">/ 10 upita</span>
      </div>

      <button
        onClick={handlePurchaseBooster}
        className="kpd-btn kpd-btn--primary"
      >
        <ShoppingCart size={16} />
        Kupi sada
      </button>
    </div>

    <div className="kpd-query-booster__current">
      <span>Vaš bonus:</span>
      <strong>{subscription?.bonusRemaining ?? 0} preostalih upita</strong>
    </div>
  </div>
</div>

{/* PURCHASE HISTORY SECTION */}
<div className="kpd-settings-card">
  <div className="kpd-settings-card__header">
    <History className="kpd-settings-card__icon" />
    <h2>Povijest kupnji</h2>
  </div>

  {purchases.length === 0 ? (
    <p className="kpd-empty">Nemate prethodnih kupnji.</p>
  ) : (
    <div className="kpd-purchase-list">
      {purchases.map((purchase) => (
        <div key={purchase.id} className="kpd-purchase-item">
          <div className="kpd-purchase-item__info">
            <span className="kpd-purchase-item__name">{purchase.productName}</span>
            <span className="kpd-purchase-item__date">
              {formatDate(purchase.purchasedAt)}
            </span>
          </div>
          <div className="kpd-purchase-item__price">
            {purchase.priceEur > 0 ? `${purchase.priceEur}€` : 'Besplatno'}
          </div>
          <div className={`kpd-badge kpd-badge--${getStatusColor(purchase.status)}`}>
            {getStatusLabel(purchase.status)}
          </div>
        </div>
      ))}
    </div>
  )}
</div>
```

### 4.3 AI Suggestion Panel - Out of Queries Enhancement

**Datoteka**: `apps/web/components/kpd/ai-suggestion-panel.tsx`

```tsx
// Ažurirati "out of queries" prikaz

{remainingQueries <= 0 && (
  <div className="kpd-out-of-queries">
    <div className="kpd-out-of-queries__icon">
      <AlertTriangle size={32} />
    </div>

    <h3>Iskoristili ste sve upite</h3>

    <div className="kpd-out-of-queries__info">
      <p>
        Vaš <strong>{planName}</strong> plan ima {monthlyLimit} upita mjesečno.
        {bonusRemaining > 0 && (
          <> Bonus upiti: <strong>{bonusRemaining}</strong> preostalih.</>
        )}
      </p>
      <p>
        <Calendar size={14} />
        Nova mjesečna kvota: <strong>{formatDate(nextResetDate)}</strong>
      </p>
    </div>

    <div className="kpd-out-of-queries__actions">
      {/* NOVA OPCIJA: Kupi Query Booster */}
      <button
        onClick={handlePurchaseBooster}
        className="kpd-btn kpd-btn--primary"
      >
        <Zap size={16} />
        Kupi 10 upita - 6.99€
      </button>

      {/* Postojeća opcija: Nadogradi plan */}
      <Link href="/settings/billing" className="kpd-btn kpd-btn--secondary">
        <ArrowUp size={16} />
        Nadogradi plan
      </Link>
    </div>
  </div>
)}
```

### 4.4 use-subscription Hook - Proširenje

**Datoteka**: `apps/web/hooks/use-subscription.ts`

```typescript
interface SubscriptionData {
  // Postojeća polja...
  plan: PlanType;
  status: SubscriptionStatus;
  monthlyQueryLimit: number;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;

  // NOVA POLJA:
  billingType: 'SUBSCRIPTION' | 'ONE_TIME';
  bonusQueryQuota: number;
  bonusRemaining: number;
  monthlyRemaining: number;
}

interface UsageData {
  usedThisMonth: number;
  remainingQueries: number;
  monthlyLimit: number;
  monthlyRemaining: number;
  bonusLimit: number;
  bonusRemaining: number;
  billingType: 'SUBSCRIPTION' | 'ONE_TIME';
}

interface Purchase {
  id: string;
  productType: string;
  productName: string;
  priceEur: number;
  queriesIncluded: number;
  status: string;
  purchasedAt: string | null;
}

export function useSubscription() {
  const [purchases, setPurchases] = useState<Purchase[]>([]);

  // Dohvati kupnje
  useEffect(() => {
    async function fetchPurchases() {
      const response = await fetch(`/api/v1/stripe/purchases/${organizationId}`);
      const data = await response.json();
      setPurchases(data);
    }
    if (organizationId) fetchPurchases();
  }, [organizationId]);

  // Metoda za kupnju Query Boostera
  const purchaseQueryBooster = async () => {
    const response = await fetch('/api/v1/stripe/checkout/one-time', {
      method: 'POST',
      body: JSON.stringify({
        organizationId,
        productType: 'QUERY_BOOSTER',
      }),
    });
    const { url } = await response.json();
    window.location.href = url;
  };

  return {
    // Postojeći returns...
    purchases,
    purchaseQueryBooster,
    bonusRemaining: usage?.bonusRemaining ?? 0,
    billingType: subscription?.billingType ?? 'SUBSCRIPTION',
  };
}
```

### 4.5 CSS Stilovi

**Datoteka**: `apps/web/app/globals.css`

```css
/* Pricing Toggle */
.kpd-pricing__toggle {
  display: flex;
  justify-content: center;
  gap: 0.5rem;
  margin-bottom: 2rem;
  padding: 0.25rem;
  background: var(--color-surface-secondary);
  border-radius: 0.5rem;
  width: fit-content;
  margin-inline: auto;
}

.kpd-pricing__toggle-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  border: none;
  background: transparent;
  border-radius: 0.375rem;
  font-weight: 500;
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: all 0.2s;
}

.kpd-pricing__toggle-btn.active {
  background: var(--color-primary);
  color: white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

/* Query Booster Card */
.kpd-query-booster {
  padding: 1.5rem;
  background: linear-gradient(135deg, var(--color-amber-50), var(--color-orange-50));
  border-radius: 0.75rem;
  border: 1px solid var(--color-amber-200);
}

.kpd-query-booster__description {
  margin-bottom: 1rem;
  color: var(--color-text-secondary);
}

.kpd-query-booster__offer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
}

.kpd-query-booster__price .amount {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--color-amber-600);
}

.kpd-query-booster__price .per {
  color: var(--color-text-secondary);
}

.kpd-query-booster__current {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding-top: 1rem;
  border-top: 1px solid var(--color-amber-200);
  font-size: 0.875rem;
}

/* Purchase History */
.kpd-purchase-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.kpd-purchase-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem;
  background: var(--color-surface-secondary);
  border-radius: 0.5rem;
}

.kpd-purchase-item__info {
  flex: 1;
}

.kpd-purchase-item__name {
  display: block;
  font-weight: 500;
}

.kpd-purchase-item__date {
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

.kpd-purchase-item__price {
  font-weight: 600;
  color: var(--color-text-primary);
}

/* Out of Queries Enhancement */
.kpd-out-of-queries__actions {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-top: 1.5rem;
}

@media (min-width: 480px) {
  .kpd-out-of-queries__actions {
    flex-direction: row;
  }
}
```

---

## 5. ADMIN PANEL PROMJENE

### 5.1 Admin Billing Page - Purchases Tab

**Datoteka**: `apps/admin/app/billing/page.tsx`

```tsx
// Dodati novi tab za Purchases
<Tabs defaultValue="subscriptions">
  <TabsList>
    <TabsTrigger value="subscriptions">Pretplate</TabsTrigger>
    <TabsTrigger value="purchases">Jednokratne kupnje</TabsTrigger>  {/* NOVO */}
    <TabsTrigger value="boosters">Query Boosteri</TabsTrigger>       {/* NOVO */}
    <TabsTrigger value="invoices">Računi</TabsTrigger>
  </TabsList>

  <TabsContent value="purchases">
    <PurchasesTable filters={{ productType: 'ONE_TIME_PLAN' }} />
  </TabsContent>

  <TabsContent value="boosters">
    <PurchasesTable filters={{ productType: 'QUERY_BOOSTER' }} />
  </TabsContent>
</Tabs>
```

### 5.2 Admin User Detail - Purchase History

**Datoteka**: `apps/admin/app/users/[id]/page.tsx`

```tsx
{/* Purchase History Section */}
<div className="admin-card">
  <h3>Povijest kupnji</h3>

  {userPurchases.length === 0 ? (
    <p className="admin-empty">Nema kupnji.</p>
  ) : (
    <table className="admin-table">
      <thead>
        <tr>
          <th>Datum</th>
          <th>Produkt</th>
          <th>Upita</th>
          <th>Cijena</th>
          <th>Status</th>
          <th>Akcije</th>
        </tr>
      </thead>
      <tbody>
        {userPurchases.map((purchase) => (
          <tr key={purchase.id}>
            <td>{formatDate(purchase.purchasedAt)}</td>
            <td>{purchase.productName}</td>
            <td>{purchase.queriesIncluded}</td>
            <td>{purchase.priceEur}€</td>
            <td>
              <span className={`admin-badge admin-badge--${getStatusColor(purchase.status)}`}>
                {purchase.status}
              </span>
            </td>
            <td>
              {purchase.status === 'COMPLETED' && (
                <button
                  onClick={() => handleRefund(purchase.id)}
                  className="admin-btn admin-btn--danger admin-btn--sm"
                >
                  Refund
                </button>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )}

  {/* Manual Grant */}
  <div className="admin-card__footer">
    <button
      onClick={() => setShowGrantModal(true)}
      className="admin-btn admin-btn--secondary"
    >
      <Gift size={16} />
      Dodijeli bonus upite
    </button>
  </div>
</div>
```

---

## 6. TESTIRANJE

### 6.1 Test Scenarios

| Scenario | Koraci | Očekivani rezultat |
|----------|--------|-------------------|
| One-time checkout | Korisnik odabere PRO jednokratno → Stripe checkout → Plaćanje | bonusQueryQuota += 20, Purchase kreiran |
| Query Booster | Korisnik klikne "Kupi 10 upita" → Stripe checkout → Plaćanje | bonusQueryQuota += 10, Purchase kreiran |
| Usage s bonus | Korisnik ima 20 mjesečno + 10 bonus, potroši 25 | monthlyRemaining=0, bonusRemaining=5 |
| Convert to subscription | Korisnik na one-time klikne "Pretplati se" | Nova subscription, bonus ostaje |
| Admin refund | Admin refundira Purchase | bonusQueryQuota -= X, Stripe refund |
| Webhook replay | Isti webhook event dva puta | Idempotentno - nema duplikata |

### 6.2 Stripe Test Cards

```
Uspješno plaćanje: 4242 4242 4242 4242
Odbijeno: 4000 0000 0000 0002
Insufficient funds: 4000 0000 0000 9995
```

### 6.3 Webhook Testing (Stripe CLI)

```bash
# Instalacija
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Forward webhooks lokalno
stripe listen --forward-to localhost:13621/api/v1/webhooks/stripe

# Trigger test event
stripe trigger checkout.session.completed
```

---

## 7. DEPLOYMENT PLAN

### 7.1 Faze Deploya

| Faza | Akcija | Rizik | Rollback |
|------|--------|-------|----------|
| 1 | Stripe produkti kreiranje | Nizak | Obriši produkte |
| 2 | Database migracija (BLUE) | Srednji | `prisma migrate resolve` |
| 3 | Backend deploy (BLUE) | Srednji | `./deploy/rollback.sh` |
| 4 | Frontend deploy (BLUE) | Nizak | `./deploy/rollback.sh` |
| 5 | Testiranje na BLUE | N/A | N/A |
| 6 | Switch BLUE → ACTIVE | Nizak | `./deploy/rollback.sh` |
| 7 | Monitoring (24h) | N/A | N/A |

### 7.2 Checklist prije deploya

```
[ ] Stripe produkti kreirani (test mode)
[ ] Environment variables dodane
[ ] Database migracija testirana lokalno
[ ] Unit testovi prolaze
[ ] Manual testing na BLUE
[ ] Webhook forwarding testiran
[ ] Disk space provjeren (df -h / < 85%)
[ ] Docker cleanup spreman
```

### 7.3 Post-deploy monitoring

```bash
# Logovi
docker logs kpd-api --tail 100 -f

# Health check
curl https://kpd.2klika.hr/api/v1/health

# Database check
docker exec kpd-postgres psql -U kpd_user -d kpd -c "SELECT COUNT(*) FROM \"Purchase\";"
```

---

## 8. PROCJENA VREMENA

| Komponenta | Procjena | Napomena |
|------------|----------|----------|
| Stripe setup | 30 min | Dashboard + .env |
| Database schema | 30 min | Migracija + seed |
| Backend API | 2-3 sata | Service + Controller + Webhook |
| Frontend UI | 2-3 sata | Pricing + Billing + Components |
| Admin panel | 1-2 sata | Tables + Detail pages |
| Testiranje | 1-2 sata | Manual + Stripe CLI |
| **UKUPNO** | **8-12 sati** | |

---

## 9. RIZICI I MITIGACIJE

| Rizik | Vjerojatnost | Utjecaj | Mitigacija |
|-------|--------------|---------|------------|
| Webhook failure | Srednja | Visok | Retry logika + audit log |
| Race condition (usage) | Niska | Srednji | Database transaction |
| Stripe API promjene | Niska | Srednji | SDK verzioniranje |
| Refund complexity | Srednja | Srednji | Jasna audit dokumentacija |
| Disk space | Srednja | Visok | Monitoring + cleanup |

---

## 10. ODOBRENJE I POTVRĐENE ODLUKE

### ✅ POTVRĐENO OD KORISNIKA (2025-12-19):

| Pitanje | Odgovor | Status |
|---------|---------|--------|
| Bonus upiti NE istječu? | **DA** - koriste se dok se ne potroše | ✅ Potvrđeno |
| Query Booster cijena 6.99€/10 upita? | **DA** | ✅ Potvrđeno |
| Prioritet: mjesečni → bonus? | **DA** - prvo mjesečni, zatim bonus | ✅ Potvrđeno |
| Admin manual grant? | **Već postoji** - `addUserCredits()` endpoint | ✅ Provjereno |
| Stripe refund iz admina? | **Nije prioritet** - može se napraviti direktno u Stripe | ⏭️ Opcionalno |

### ⚠️ NAPOMENA O POSTOJEĆEM `addUserCredits()`

Postojeći endpoint `POST /admin/users/:userId/add-credits` povećava `monthlyQueryLimit` koji se **resetira svakog mjeseca**.

Za bonus upite koji **NE istječu**, koristit ćemo **novo polje `bonusQueryQuota`** koje:
- NE resetira se automatski
- Troši se NAKON mjesečne kvote
- Prati se zasebno u Purchase modelu

### 📋 IMPLEMENTACIJSKI REDOSLIJED

1. **Database migracija** - Dodati `BillingType`, `bonusQueryQuota`, `Purchase` model
2. **Backend API** - Novi endpointi za one-time checkout
3. **Webhook handler** - Proširiti za `checkout.session.completed` s `mode: 'payment'`
4. **Frontend Pricing** - Per-card billing tabs
5. **Frontend Billing Settings** - Query Booster kartica, povijest kupnji
6. **Admin panel** - Purchases tab (opcionalno - može kasnije)

---

**Dokument kreirao**: Claude Code
**Verzija**: 2.0
**Datum**: 2025-12-19
**Status**: ✅ ODOBRENO - SPREMNO ZA IMPLEMENTACIJU

---

## 11. STRIPE PRODUKTI - SAŽETAK

### Kreirani produkti (TEST MODE):

```
Query Booster:
  Product ID: prod_TdLXN80Wpu51Bo
  Price ID:   price_1Sg4qhKFcGpdxTuIumDZtDDK (6.99€, one-time)

KPD Basic One-Time:
  Price ID:   price_1Sg4qhKFcGpdxTuICyxxShAB (6.99€, one-time)

KPD Pro One-Time:
  Price ID:   price_1Sg4qiKFcGpdxTuIc79FSUu8 (11.99€, one-time)

KPD Business One-Time:
  Price ID:   price_1Sg4qiKFcGpdxTuI7CdZN63e (30.99€, one-time)

KPD Enterprise One-Time:
  Price ID:   price_1Sg4qiKFcGpdxTuIPgYeMlJa (199€, one-time)
```

**Sljedeći korak**: Kada budemo spremni za produkciju, kreirat ćemo iste produkte u Stripe LIVE mode.
