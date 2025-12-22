# PLAN: Jednokratna Placanja i Query Booster - DETALJNI FAZNI PLAN

**Verzija**: 3.0
**Datum**: 2025-12-19
**Status**: U PRIPREMI - CEKA STRIPE LIVE PRODUKTE
**Autor**: Claude Code

---

## EXECUTIVE SUMMARY

### Sto se implementira:
1. **Jednokratni paketi** - Kupnja bilo kojeg paketa kao one-time (ne subscription)
2. **Query Booster** - 10 dodatnih upita za 6.99EUR kad korisnik potrosi kvotu
3. **Per-card billing selection** - Svaka kartica ima svoj toggle za billing tip

### Kriticne lokacije koje se mijenjaju:

| Lokacija | URL | Datoteka | Utjecaj |
|----------|-----|----------|---------|
| Landing pricing | /#pricing | `components/landing/pricing-section.tsx` | Dodaj per-card billing tabs |
| Pricing stranica | /pricing | `app/pricing/page.tsx` | Dodaj per-card billing tabs |
| Dashboard billing | /settings/billing | `app/(dashboard)/settings/billing/page.tsx` | Query Booster + povijest |
| Admin billing | /admin/billing | `app/admin/billing/page.tsx` | Purchases tabovi |
| Admin org detail | /admin/organizations/[id] | `app/admin/organizations/[id]/page.tsx` | Grant bonus + history |
| AI panel | (dashboard) | `components/kpd/ai-suggestion-panel.tsx` | "Kupi upite" CTA |

---

## FAZA 0: STRIPE LIVE PRODUKTI

### Status: CEKA KONFIGURACIJU

**Problem**: Stripe MCP je povezan s TEST mode API kljucem (`livemode: false`).

**Potrebno**:
1. Pristup Stripe Dashboard za KPD
2. Kreirati produkte u LIVE mode

### Stripe produkti za kreirati (LIVE):

| Naziv | Tip | Cijena | Opis |
|-------|-----|--------|------|
| KPD Query Booster | one-time | 6.99 EUR | 10 dodatnih upita |
| KPD Basic One-Time | one-time | 6.99 EUR | 10 upita |
| KPD Pro One-Time | one-time | 11.99 EUR | 20 upita |
| KPD Business One-Time | one-time | 30.99 EUR | 50 upita |
| KPD Enterprise One-Time | one-time | 199 EUR | 2500 upita |

### Environment varijable za dodati:

```env
# U docker/green.env i docker/blue.env:
STRIPE_PRICE_BASIC_ONETIME=price_live_xxx
STRIPE_PRICE_PRO_ONETIME=price_live_xxx
STRIPE_PRICE_BUSINESS_ONETIME=price_live_xxx
STRIPE_PRICE_ENTERPRISE_ONETIME=price_live_xxx
STRIPE_PRICE_QUERY_BOOSTER=price_live_xxx
STRIPE_PRODUCT_QUERY_BOOSTER=prod_live_xxx
```

---

## FAZA 1: DATABASE SCHEMA PROMJENE

### 1.1 Datoteka: `packages/database/prisma/schema.prisma`

**Promjene**:

```prisma
// DODATI na vrh (nakon postojecih enumova):

enum BillingType {
  SUBSCRIPTION  // Mjesecna pretplata (recurring)
  ONE_TIME      // Jednokratna kupnja
}

enum PurchaseType {
  ONE_TIME_PLAN   // Jednokratni paket (BASIC/PRO/BUSINESS/ENTERPRISE)
  QUERY_BOOSTER   // Dodatni upiti (10 za 6.99 EUR)
  MANUAL_GRANT    // Admin dodijelio besplatno
}

enum PurchaseStatus {
  PENDING     // Ceka placanje
  COMPLETED   // Placeno i primijenjeno
  REFUNDED    // Vracen novac
}

// MODIFICIRATI Subscription model - DODATI nova polja:

model Subscription {
  // ... postojeca polja (NE DIRATI!) ...

  // NOVA POLJA (backward compatible - sva imaju default):
  billingType        BillingType @default(SUBSCRIPTION)
  bonusQueryQuota    Int         @default(0)  // Kupljeni bonus upiti - NE RESETIRAJU SE!
}

// DODATI novi model Purchase:

model Purchase {
  id                      String         @id @default(cuid())
  organizationId          String

  // Stripe veza
  stripePaymentIntentId   String?        @unique
  stripeCheckoutSessionId String?

  // Produkt info
  productType             PurchaseType
  productName             String
  priceEur                Float

  // Benefit
  queriesIncluded         Int

  // Status
  status                  PurchaseStatus @default(PENDING)
  purchasedAt             DateTime?
  refundedAt              DateTime?
  refundReason            String?

  createdAt               DateTime       @default(now())
  updatedAt               DateTime       @updatedAt

  organization            Organization   @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  @@index([organizationId])
  @@index([status])
  @@index([productType])
}

// MODIFICIRATI Organization model - DODATI relaciju:

model Organization {
  // ... postojeca polja ...
  purchases         Purchase[]  // DODATI
}
```

### 1.2 Migracija

```bash
cd /var/www/vhosts/kpd.2klika.hr/httpdocs/packages/database
npx prisma migrate dev --name add_one_time_billing
```

### 1.3 Utjecaj na postojeci kod

| Komponenta | Utjecaj | Akcija potrebna |
|------------|---------|-----------------|
| Subscription queries | NEMA | Nova polja imaju default |
| Usage counting | NEMA | Postojeci kod ignorira bonusQueryQuota |
| Webhook handlers | NEMA | Ne koriste nova polja |
| Admin service | NEMA | Ne koristi nova polja |

### 1.4 Verifikacija

```sql
-- Nakon migracije provjeri:
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'Subscription' AND column_name IN ('billingType', 'bonusQueryQuota');

SELECT COUNT(*) FROM "Purchase";  -- Treba biti 0
```

---

## FAZA 2: BACKEND - STRIPE SERVICE PROSIRENJE

### 2.1 Datoteka: `apps/api/src/modules/stripe/stripe.service.ts`

**Lokacija promjena**: Nakon linije 37 (nakon constructor)

**DODATI price ID-eve u constructor**:

```typescript
// U constructor, PROSIRITI priceIds objekt:
this.priceIds = {
  // Postojeci (NE DIRATI):
  BASIC: this.config.get<string>('STRIPE_PRICE_BASIC') || '',
  PRO: this.config.get<string>('STRIPE_PRICE_PRO') || '',
  BUSINESS: this.config.get<string>('STRIPE_PRICE_BUSINESS') || '',
  ENTERPRISE: this.config.get<string>('STRIPE_PRICE_ENTERPRISE') || '',

  // NOVI (one-time):
  BASIC_ONETIME: this.config.get<string>('STRIPE_PRICE_BASIC_ONETIME') || '',
  PRO_ONETIME: this.config.get<string>('STRIPE_PRICE_PRO_ONETIME') || '',
  BUSINESS_ONETIME: this.config.get<string>('STRIPE_PRICE_BUSINESS_ONETIME') || '',
  ENTERPRISE_ONETIME: this.config.get<string>('STRIPE_PRICE_ENTERPRISE_ONETIME') || '',
  QUERY_BOOSTER: this.config.get<string>('STRIPE_PRICE_QUERY_BOOSTER') || '',
};
```

**DODATI nove metode** (na kraju klase, prije zatvorene zagrade):

```typescript
// ============================================
// ONE-TIME PAYMENT METHODS
// ============================================

/**
 * Kreiraj Stripe Checkout Session za jednokratnu kupnju
 */
async createOneTimeCheckoutSession(
  organizationId: string,
  productType: 'ONE_TIME_PLAN' | 'QUERY_BOOSTER',
  planType?: 'BASIC' | 'PRO' | 'BUSINESS' | 'ENTERPRISE',
  successUrl?: string,
  cancelUrl?: string,
): Promise<{ url: string }> {
  const customerId = await this.getOrCreateCustomer(organizationId);

  // Odredi price ID i broj upita
  let priceId: string;
  let queriesGranted: number;
  let productName: string;

  if (productType === 'QUERY_BOOSTER') {
    priceId = this.priceIds.QUERY_BOOSTER;
    queriesGranted = 10;
    productName = 'Query Booster (10 upita)';
  } else {
    // ONE_TIME_PLAN
    if (!planType) {
      throw new BadRequestException('planType je obavezan za ONE_TIME_PLAN');
    }

    const planConfig: Record<string, { priceKey: string; queries: number }> = {
      BASIC: { priceKey: 'BASIC_ONETIME', queries: 10 },
      PRO: { priceKey: 'PRO_ONETIME', queries: 20 },
      BUSINESS: { priceKey: 'BUSINESS_ONETIME', queries: 50 },
      ENTERPRISE: { priceKey: 'ENTERPRISE_ONETIME', queries: 2500 },
    };

    const config = planConfig[planType];
    if (!config) {
      throw new BadRequestException(`Nevalidan plan: ${planType}`);
    }

    priceId = this.priceIds[config.priceKey];
    queriesGranted = config.queries;
    productName = `KPD ${planType} (jednokratno)`;
  }

  if (!priceId) {
    throw new BadRequestException('Price ID nije konfiguriran za ovaj produkt');
  }

  // Kreiraj Stripe Checkout Session
  const session = await this.stripe.checkout.sessions.create({
    mode: 'payment',  // KLJUCNA RAZLIKA od subscription!
    customer: customerId,
    payment_method_types: ['card'],
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: successUrl || `${this.appUrl}/settings/billing?purchase=success`,
    cancel_url: cancelUrl || `${this.appUrl}/settings/billing?purchase=canceled`,
    metadata: {
      organizationId,
      productType,
      planType: planType || '',
      queriesGranted: queriesGranted.toString(),
    },
    payment_intent_data: {
      metadata: {
        organizationId,
        productType,
        queriesGranted: queriesGranted.toString(),
      },
    },
    allow_promotion_codes: true,
    billing_address_collection: 'required',
    customer_update: {
      name: 'auto',
      address: 'auto',
    },
  });

  if (!session.url) {
    throw new BadRequestException('Nije moguce kreirati checkout session');
  }

  // Kreiraj PENDING Purchase zapis
  await this.prisma.purchase.create({
    data: {
      organizationId,
      stripeCheckoutSessionId: session.id,
      productType,
      productName,
      priceEur: (session.amount_total ?? 0) / 100,
      queriesIncluded: queriesGranted,
      status: 'PENDING',
    },
  });

  this.logger.log(`Kreiran one-time checkout za org ${organizationId}: ${productName}`);

  return { url: session.url };
}

/**
 * Handle uspjesno zavrseno jednokratno placanje
 */
async handleOneTimePaymentCompleted(session: Stripe.Checkout.Session): Promise<void> {
  const { organizationId, productType, queriesGranted } = session.metadata || {};

  if (!organizationId || !productType || !queriesGranted) {
    this.logger.error('One-time payment bez potrebnih metadata', session.metadata);
    return;
  }

  const queries = parseInt(queriesGranted, 10);

  // 1. Dodaj bonus upite na subscription
  await this.prisma.subscription.upsert({
    where: { organizationId },
    create: {
      organizationId,
      plan: 'FREE',
      status: 'ACTIVE',
      billingType: productType === 'ONE_TIME_PLAN' ? 'ONE_TIME' : 'SUBSCRIPTION',
      bonusQueryQuota: queries,
      dailyQueryLimit: 0,
      monthlyQueryLimit: 0,
    },
    update: {
      bonusQueryQuota: { increment: queries },
      // Ako je ONE_TIME_PLAN i nema aktivne subscription, postavi tip
      ...(productType === 'ONE_TIME_PLAN' && {
        billingType: 'ONE_TIME',
      }),
    },
  });

  // 2. Azuriraj Purchase zapis
  await this.prisma.purchase.updateMany({
    where: { stripeCheckoutSessionId: session.id },
    data: {
      stripePaymentIntentId: session.payment_intent as string,
      status: 'COMPLETED',
      purchasedAt: new Date(),
    },
  });

  this.logger.log(`One-time payment completed: +${queries} upita za org ${organizationId}`);
}

/**
 * Dohvati povijest kupnji za organizaciju
 */
async getPurchaseHistory(organizationId: string): Promise<any[]> {
  return this.prisma.purchase.findMany({
    where: { organizationId },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
}

/**
 * Dohvati planove s one-time cijenama
 */
async getPlansWithOneTime() {
  const plans = await this.prisma.planConfig.findMany({
    orderBy: { sortOrder: 'asc' },
  });

  return plans.map((plan) => ({
    ...plan,
    priceId: this.priceIds[plan.plan] || null,
    priceIdOneTime: this.priceIds[`${plan.plan}_ONETIME`] || null,
  }));
}
```

### 2.2 Utjecaj na postojeci kod

| Komponenta | Utjecaj | Akcija |
|------------|---------|--------|
| createCheckoutSession | NEMA | Postojeca metoda za subscription |
| createPortalSession | NEMA | Bez promjena |
| upgradeSubscription | NEMA | Bez promjena |
| handleWebhookEvent | TREBA PROSIRITI | Vidi 2.3 |

### 2.3 Datoteka: `apps/api/src/modules/stripe/stripe.service.ts`

**Lokacija**: Metoda `handleWebhookEvent()` (oko linije 375)

**MODIFICIRATI switch statement**:

```typescript
// ZAMIJENI postojeci case za checkout.session.completed:

case 'checkout.session.completed':
  const checkoutSession = event.data.object as Stripe.Checkout.Session;

  if (checkoutSession.mode === 'payment') {
    // NOVO: One-time payment
    await this.handleOneTimePaymentCompleted(checkoutSession);
  } else if (checkoutSession.mode === 'subscription') {
    // Postojeca logika
    await this.handleCheckoutCompleted(checkoutSession);
  }
  break;

// DODATI novi case za refund (opcionalno):
case 'charge.refunded':
  const charge = event.data.object as Stripe.Charge;
  this.logger.log(`Charge refunded: ${charge.id}`);
  // Handle u buducoj fazi ako potrebno
  break;
```

---

## FAZA 3: BACKEND - STRIPE CONTROLLER

### 3.1 Datoteka: `apps/api/src/modules/stripe/stripe.controller.ts`

**Lokacija**: Nakon postojecih endpointa (kraj klase)

**DODATI nove endpointe**:

```typescript
// ============================================
// ONE-TIME PAYMENT ENDPOINTS
// ============================================

/**
 * POST /api/v1/stripe/checkout/one-time
 * Kreiraj checkout session za jednokratnu kupnju
 */
@Post('checkout/one-time')
@UseGuards(JwtAuthGuard, OrganizationMemberGuard)
async createOneTimeCheckout(
  @Body() body: {
    organizationId: string;
    productType: 'ONE_TIME_PLAN' | 'QUERY_BOOSTER';
    planType?: 'BASIC' | 'PRO' | 'BUSINESS' | 'ENTERPRISE';
    successUrl?: string;
    cancelUrl?: string;
  },
) {
  return this.stripeService.createOneTimeCheckoutSession(
    body.organizationId,
    body.productType,
    body.planType,
    body.successUrl,
    body.cancelUrl,
  );
}

/**
 * GET /api/v1/stripe/purchases/:organizationId
 * Dohvati povijest kupnji
 */
@Get('purchases/:organizationId')
@UseGuards(JwtAuthGuard, OrganizationMemberGuard)
async getPurchases(@Param('organizationId') organizationId: string) {
  return this.stripeService.getPurchaseHistory(organizationId);
}

/**
 * GET /api/v1/stripe/plans-with-onetime
 * Dohvati planove s one-time cijenama
 */
@Get('plans-with-onetime')
async getPlansWithOneTime() {
  return this.stripeService.getPlansWithOneTime();
}
```

### 3.2 Datoteka: `apps/api/src/modules/stripe/dto/create-checkout.dto.ts`

**KREIRATI NOVU DATOTEKU** (ako ne postoji DTO):

```typescript
import { IsString, IsIn, IsOptional } from 'class-validator';

export class CreateOneTimeCheckoutDto {
  @IsString()
  organizationId: string;

  @IsIn(['ONE_TIME_PLAN', 'QUERY_BOOSTER'])
  productType: 'ONE_TIME_PLAN' | 'QUERY_BOOSTER';

  @IsOptional()
  @IsIn(['BASIC', 'PRO', 'BUSINESS', 'ENTERPRISE'])
  planType?: 'BASIC' | 'PRO' | 'BUSINESS' | 'ENTERPRISE';

  @IsOptional()
  @IsString()
  successUrl?: string;

  @IsOptional()
  @IsString()
  cancelUrl?: string;
}
```

---

## FAZA 4: BACKEND - USAGE LOGIC UPDATE

### 4.1 Datoteka: `apps/api/src/modules/kpd/services/kpd-suggestion.service.ts`

**Lokacija**: Metoda koja broji usage (potrebno pronaci tocnu lokaciju)

**MODIFICIRATI usage counting logiku**:

```typescript
// PRONACI metodu koja vraca preostale upite i MODIFICIRATI:

async getUsageInfo(organizationId: string): Promise<{
  usedThisMonth: number;
  remainingQueries: number;
  monthlyLimit: number;
  monthlyRemaining: number;
  bonusLimit: number;
  bonusRemaining: number;
  billingType: string;
}> {
  const subscription = await this.prisma.subscription.findUnique({
    where: { organizationId },
  });

  const monthlyLimit = subscription?.monthlyQueryLimit ?? 3;  // FREE default
  const bonusLimit = subscription?.bonusQueryQuota ?? 0;
  const billingType = subscription?.billingType ?? 'SUBSCRIPTION';

  // Odredivanje perioda za brojanje
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const periodStart = subscription?.currentPeriodStart ?? monthStart;
  const countFromDate = periodStart > monthStart ? periodStart : monthStart;

  // Brojanje uspjesnih upita ovaj mjesec
  const usedThisMonth = await this.prisma.query.count({
    where: {
      organizationId,
      createdAt: { gte: countFromDate },
      NOT: { suggestedCodes: { equals: [] } },
    },
  });

  // NOVA LOGIKA: Razdvoji monthly i bonus
  let monthlyRemaining: number;
  let bonusRemaining: number;

  if (billingType === 'ONE_TIME' && !subscription?.stripeSubscriptionId) {
    // ONE_TIME bez aktivne subscription - koristi SAMO bonus
    monthlyRemaining = 0;
    bonusRemaining = Math.max(0, bonusLimit - usedThisMonth);
  } else {
    // SUBSCRIPTION ili mjesovito - prvo monthly, pa bonus
    const usedFromMonthly = Math.min(usedThisMonth, monthlyLimit);
    const usedFromBonus = Math.max(0, usedThisMonth - monthlyLimit);

    monthlyRemaining = Math.max(0, monthlyLimit - usedFromMonthly);
    bonusRemaining = Math.max(0, bonusLimit - usedFromBonus);
  }

  const remainingQueries = monthlyRemaining + bonusRemaining;

  return {
    usedThisMonth,
    remainingQueries,
    monthlyLimit,
    monthlyRemaining,
    bonusLimit,
    bonusRemaining,
    billingType,
  };
}
```

### 4.2 Utjecaj na postojeci kod

| Komponenta | Utjecaj | Akcija |
|------------|---------|--------|
| checkUsageLimit | POTREBNO PROSIRITI | Dodati bonus logiku |
| getSuggestions | NEMA | Koristi checkUsageLimit |
| Usage display | TREBA AZURIRATI | Prikazati bonus info |

---

## FAZA 5: FRONTEND - PRICING STRANICE

### 5.1 Zajednicka komponenta: `apps/web/components/pricing/pricing-card.tsx`

**KREIRATI NOVU KOMPONENTU**:

```tsx
'use client';

import { useState } from 'react';
import { Check, RefreshCw, ShoppingCart } from 'lucide-react';

interface Plan {
  plan: string;
  displayName: string;
  monthlyPriceEur: number;
  monthlyQueryLimit: number;
  features: string[];
  isPopular?: boolean;
}

interface PricingCardProps {
  plan: Plan;
  onSelectPlan: (plan: Plan, billingType: 'subscription' | 'one_time') => void;
  isLoggedIn: boolean;
}

export function PricingCard({ plan, onSelectPlan, isLoggedIn }: PricingCardProps) {
  const [billingType, setBillingType] = useState<'subscription' | 'one_time'>('subscription');

  const isFree = plan.plan === 'FREE';

  // Features prilagodene billing tipu
  const getFeatures = () => {
    if (billingType === 'one_time' && !isFree) {
      return [
        `${plan.monthlyQueryLimit} upita (ne istjecu!)`,
        'AI klasifikacija KPD sifara',
        'Export rezultata u Excel',
        'Bez mjesecne obveze',
      ];
    }
    return plan.features || [
      `${plan.monthlyQueryLimit} upita mjesecno`,
      'AI klasifikacija KPD sifara',
      'Export rezultata u Excel',
      'Email podrska',
    ];
  };

  return (
    <div className={`kpd-pricing-card ${plan.isPopular ? 'kpd-pricing-card--popular' : ''}`}>
      {plan.isPopular && (
        <div className="kpd-pricing-card__badge">Najpopularniji</div>
      )}

      <h3 className="kpd-pricing-card__name">{plan.displayName}</h3>

      {/* BILLING TYPE TABS - samo za placive planove */}
      {!isFree && (
        <div className="kpd-pricing-card__billing-tabs">
          <button
            className={`kpd-pricing-card__tab ${billingType === 'subscription' ? 'active' : ''}`}
            onClick={() => setBillingType('subscription')}
          >
            <RefreshCw size={14} />
            Mjesecno
          </button>
          <button
            className={`kpd-pricing-card__tab ${billingType === 'one_time' ? 'active' : ''}`}
            onClick={() => setBillingType('one_time')}
          >
            <ShoppingCart size={14} />
            Jednokratno
          </button>
        </div>
      )}

      {/* CIJENA */}
      <div className="kpd-pricing-card__price">
        <span className="kpd-pricing-card__amount">
          {isFree ? 'Besplatno' : `${plan.monthlyPriceEur}EUR`}
        </span>
        {!isFree && (
          <span className="kpd-pricing-card__period">
            {billingType === 'subscription' ? '/mjesecno' : 'jednokratno'}
          </span>
        )}
      </div>

      {/* FEATURES */}
      <ul className="kpd-pricing-card__features">
        {getFeatures().map((feature, i) => (
          <li key={i}>
            <Check size={16} className="kpd-pricing-card__check" />
            {feature}
          </li>
        ))}
      </ul>

      {/* CTA BUTTON */}
      <button
        onClick={() => onSelectPlan(plan, billingType)}
        className="kpd-btn kpd-btn--primary kpd-pricing-card__cta"
      >
        {isFree
          ? 'Zapocni besplatno'
          : billingType === 'subscription'
            ? 'Pretplati se'
            : `Kupi ${plan.displayName}`
        }
      </button>
    </div>
  );
}
```

### 5.2 Datoteka: `apps/web/components/landing/pricing-section.tsx`

**LOKACIJA**: Cijela komponenta treba refaktoring

**KLJUCNE PROMJENE**:

1. Importati novu PricingCard komponentu
2. Ukloniti globalni toggle (ako postoji)
3. Koristiti per-card billing selection
4. Dodati handler za one-time checkout

```tsx
// MODIFICIRATI handleSelectPlan funkciju:

const handleSelectPlan = async (plan: Plan, billingType: 'subscription' | 'one_time') => {
  if (!isLoggedIn) {
    // Redirect na register
    router.push(`/register?plan=${plan.plan}&billing=${billingType}`);
    return;
  }

  if (billingType === 'one_time') {
    // NOVO: One-time checkout
    try {
      const response = await fetch('/api/v1/stripe/checkout/one-time', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          organizationId,
          productType: 'ONE_TIME_PLAN',
          planType: plan.plan,
        }),
      });
      const { url } = await response.json();
      window.location.href = url;
    } catch (error) {
      console.error('Checkout error:', error);
      alert('Doslo je do greske. Molimo pokusajte ponovno.');
    }
  } else {
    // Postojeca logika za subscription checkout
    // ...
  }
};
```

### 5.3 Datoteka: `apps/web/app/pricing/page.tsx`

**ISTE PROMJENE kao 5.2** - koristi istu PricingCard komponentu

---

## FAZA 6: FRONTEND - DASHBOARD BILLING

### 6.1 Datoteka: `apps/web/app/(dashboard)/settings/billing/page.tsx`

**DODATI Query Booster sekciju** (nakon prikaza trenutne pretplate):

```tsx
{/* QUERY BOOSTER SECTION */}
<div className="kpd-card mt-6">
  <div className="kpd-card__header">
    <Zap className="w-5 h-5 text-amber-500" />
    <h2 className="text-lg font-semibold">Dodatni upiti</h2>
  </div>

  <div className="p-6">
    <p className="text-gray-600 mb-4">
      Trebate vise upita? Kupite paket od 10 dodatnih upita koji nikad ne istjecu.
    </p>

    <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-lg p-4">
      <div>
        <span className="text-2xl font-bold text-amber-600">6.99EUR</span>
        <span className="text-gray-500 ml-1">/ 10 upita</span>
      </div>

      <button
        onClick={handlePurchaseBooster}
        className="kpd-btn kpd-btn--primary"
      >
        <ShoppingCart size={16} />
        Kupi sada
      </button>
    </div>

    {/* Prikaz trenutnog bonusa */}
    {usageInfo?.bonusRemaining > 0 && (
      <div className="mt-4 text-sm text-gray-600">
        <span>Vas bonus: </span>
        <strong className="text-green-600">{usageInfo.bonusRemaining} preostalih upita</strong>
      </div>
    )}
  </div>
</div>

{/* PURCHASE HISTORY SECTION */}
<div className="kpd-card mt-6">
  <div className="kpd-card__header">
    <History className="w-5 h-5" />
    <h2 className="text-lg font-semibold">Povijest kupnji</h2>
  </div>

  <div className="p-6">
    {purchases.length === 0 ? (
      <p className="text-gray-500 text-center py-4">Nemate prethodnih kupnji.</p>
    ) : (
      <div className="space-y-3">
        {purchases.map((purchase) => (
          <div key={purchase.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div>
              <span className="font-medium">{purchase.productName}</span>
              <span className="text-sm text-gray-500 block">
                {formatDate(purchase.purchasedAt)}
              </span>
            </div>
            <div className="text-right">
              <span className="font-medium">{purchase.priceEur}EUR</span>
              <span className={`text-xs ml-2 px-2 py-0.5 rounded ${
                purchase.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                purchase.status === 'REFUNDED' ? 'bg-red-100 text-red-700' :
                'bg-gray-100 text-gray-700'
              }`}>
                {purchase.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    )}
  </div>
</div>
```

**DODATI handler**:

```tsx
const handlePurchaseBooster = async () => {
  try {
    const response = await fetch('/api/v1/stripe/checkout/one-time', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        organizationId,
        productType: 'QUERY_BOOSTER',
      }),
    });
    const { url } = await response.json();
    window.location.href = url;
  } catch (error) {
    console.error('Checkout error:', error);
    alert('Doslo je do greske.');
  }
};
```

**DODATI state za purchases**:

```tsx
const [purchases, setPurchases] = useState<Purchase[]>([]);

useEffect(() => {
  async function fetchPurchases() {
    if (!organizationId || !token) return;
    try {
      const res = await fetch(`/api/v1/stripe/purchases/${organizationId}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setPurchases(data);
      }
    } catch (e) {
      console.error('Failed to fetch purchases:', e);
    }
  }
  fetchPurchases();
}, [organizationId, token]);
```

---

## FAZA 7: FRONTEND - AI SUGGESTION PANEL

### 7.1 Datoteka: `apps/web/components/kpd/ai-suggestion-panel.tsx`

**PRONACI "out of queries" prikaz i PROSIRITI**:

```tsx
{remainingQueries <= 0 && (
  <div className="kpd-out-of-queries">
    <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-3" />

    <h3 className="text-lg font-semibold mb-2">Iskoristili ste sve upite</h3>

    <p className="text-gray-600 text-sm mb-4">
      Vas {planName} plan ima {monthlyLimit} upita mjesecno.
      {bonusRemaining > 0 && (
        <> Bonus: <strong>{bonusRemaining}</strong> preostalih.</>
      )}
    </p>

    {/* NOVO: Dvije opcije */}
    <div className="flex flex-col sm:flex-row gap-3">
      <button
        onClick={handlePurchaseBooster}
        className="kpd-btn kpd-btn--primary flex-1"
      >
        <Zap size={16} />
        Kupi 10 upita - 6.99EUR
      </button>

      <Link
        href="/settings/billing"
        className="kpd-btn kpd-btn--secondary flex-1 text-center"
      >
        <ArrowUp size={16} />
        Nadogradi plan
      </Link>
    </div>

    <p className="text-xs text-gray-400 mt-4">
      Nova mjesecna kvota: {formatDate(nextResetDate)}
    </p>
  </div>
)}
```

---

## FAZA 8: ADMIN PANEL

### 8.1 Datoteka: `apps/web/app/admin/billing/page.tsx`

**DODATI novi tab za Purchases**:

```tsx
// U TabsList dodati:
<TabsTrigger value="purchases">Jednokratne kupnje</TabsTrigger>

// Dodati TabsContent:
<TabsContent value="purchases">
  <PurchasesTable
    filters={{ productType: 'ONE_TIME_PLAN' }}
    onRefund={handleRefund}
  />
</TabsContent>

<TabsContent value="boosters">
  <PurchasesTable
    filters={{ productType: 'QUERY_BOOSTER' }}
    onRefund={handleRefund}
  />
</TabsContent>
```

### 8.2 Datoteka: `apps/web/app/admin/organizations/[id]/page.tsx`

**MODIFICIRATI "Dodaj kredite" button** (linija 390-392):

```tsx
// ZAMIJENI postojeci button koji samo pokazuje alert:
<button
  onClick={() => setShowGrantModal(true)}
  className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-green-50 text-green-700 rounded-lg hover:bg-green-100"
>
  <Gift className="w-3 h-3" />
  Dodaj bonus upite
</button>

// DODATI modal:
{showGrantModal && (
  <GrantBonusModal
    organizationId={orgId}
    onClose={() => setShowGrantModal(false)}
    onSuccess={() => {
      setShowGrantModal(false);
      fetchOrgDetail();
    }}
  />
)}
```

---

## FAZA 9: TESTIRANJE

### 9.1 Stripe Test Kartice

```
Uspjesno placanje: 4242 4242 4242 4242
Odbijeno: 4000 0000 0000 0002
Insufficient funds: 4000 0000 0000 9995
```

### 9.2 Test Scenariji

| # | Scenarij | Koraci | Ocekivani rezultat |
|---|----------|--------|-------------------|
| 1 | Query Booster kupnja | Klikni "Kupi 10 upita", plati | bonusQueryQuota += 10, Purchase kreiran |
| 2 | One-time PRO | Odaberi PRO jednokratno, plati | bonusQueryQuota += 20, billingType='ONE_TIME' |
| 3 | Usage s bonusom | Korisnik ima 10 monthly + 5 bonus, potrosi 12 | monthlyRemaining=0, bonusRemaining=3 |
| 4 | Out of queries | Potrosi sve upite | Vidi "Kupi upite" CTA |
| 5 | Admin grant | Admin dodijeli 50 upita | bonusQueryQuota += 50, Purchase MANUAL_GRANT |
| 6 | Webhook idempotency | Isti webhook 2x | Nema duplikata |

### 9.3 Chrome DevTools Testiranje

```bash
# Navigiraj na pricing
mcp__chrome-devtools__navigate_page url=https://kpd.2klika.hr/pricing

# Snapshot
mcp__chrome-devtools__take_snapshot

# Klikni na billing tab neke kartice
mcp__chrome-devtools__click uid=xxx
```

---

## FAZA 10: DEPLOYMENT

### 10.1 Pre-deployment checklist

```
[ ] FAZA 0: Stripe LIVE produkti kreirani
[ ] FAZA 0: Environment varijable dodane u docker/*.env
[ ] FAZA 1: Database migracija pripremljena
[ ] FAZA 2-4: Backend kod testiran lokalno
[ ] FAZA 5-8: Frontend kod testiran lokalno
[ ] df -h / pokazuje < 85% disk usage
```

### 10.2 Deployment koraci

```bash
cd /var/www/vhosts/kpd.2klika.hr/httpdocs

# 1. Provjeri status
./deploy/switch.sh status

# 2. Deploy na STANDBY (GREEN ako je BLUE aktivan)
./deploy/deploy.sh

# 3. Testiraj na STANDBY portu
curl http://localhost:13630/api/v1/health
curl http://localhost:13631/api/v1/stripe/plans-with-onetime

# 4. Switch
./deploy/switch.sh green  # ili blue

# 5. Cleanup
docker image prune -f
docker builder prune -f
```

### 10.3 Rollback

```bash
# Ako nesto nije OK:
./deploy/rollback.sh

# Database rollback (ako potrebno):
cd packages/database
npx prisma migrate resolve --rolled-back add_one_time_billing
```

---

## SAZSETAK DATOTEKA ZA MODIFICIRATI

| Faza | Datoteka | Tip promjene |
|------|----------|--------------|
| 1 | `packages/database/prisma/schema.prisma` | Dodaj enum + model + polja |
| 2 | `apps/api/src/modules/stripe/stripe.service.ts` | Dodaj metode |
| 3 | `apps/api/src/modules/stripe/stripe.controller.ts` | Dodaj endpointe |
| 4 | `apps/api/src/modules/kpd/services/kpd-suggestion.service.ts` | Modificiraj usage |
| 5 | `apps/web/components/pricing/pricing-card.tsx` | NOVA datoteka |
| 5 | `apps/web/components/landing/pricing-section.tsx` | Koristi novu komponentu |
| 5 | `apps/web/app/pricing/page.tsx` | Koristi novu komponentu |
| 6 | `apps/web/app/(dashboard)/settings/billing/page.tsx` | Dodaj sekcije |
| 7 | `apps/web/components/kpd/ai-suggestion-panel.tsx` | Dodaj CTA |
| 8 | `apps/web/app/admin/billing/page.tsx` | Dodaj tab |
| 8 | `apps/web/app/admin/organizations/[id]/page.tsx` | Dodaj modal |

---

**Dokument kreirao**: Claude Code
**Verzija**: 3.0
**Datum**: 2025-12-19
**Status**: U PRIPREMI - CEKA STRIPE LIVE PRODUKTE
