# FAZA 3: SUBSCRIPTION & BILLING

**Status**: Ceka
**Preduvjeti**: PHASE_2_AUTH.md - kompletirana
**Sljedeca faza**: PHASE_4_KPD_TOOL.md

---

## Cilj Faze

Implementirati kompletan Stripe subscription sustav s webhook-ovima i lifecycle managementom.

---

## Stripe Setup (Prije Kodiranja!)

### 1. Kreiraj Produkte u Stripe Dashboard

**URL**: https://dashboard.stripe.com/products

| Plan | Name | Description | Billing | Price |
|------|------|-------------|---------|-------|
| BASIC | KPD Basic | Za male poduzetnike | Monthly | 9.99 EUR |
| PRO | KPD Pro | Za rastuce timove | Monthly | 19.99 EUR |
| ENTERPRISE | KPD Enterprise | Za velike organizacije | Monthly | 49.99 EUR |

### 2. Kopiraj Price IDs

Nakon kreiranja, azuriraj `.env`:

```env
STRIPE_PRICE_BASIC=price_xxx
STRIPE_PRICE_PRO=price_xxx
STRIPE_PRICE_ENTERPRISE=price_xxx
```

### 3. Konfiguriraj Webhook

**URL**: https://dashboard.stripe.com/webhooks

**Endpoint URL**: `https://kpd.2klika.hr/api/webhooks/stripe`

**Events za slusati**:
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_succeeded`
- `invoice.payment_failed`
- `invoice.upcoming`

**Kopiraj webhook secret u .env**:
```env
STRIPE_WEBHOOK_SECRET=whsec_xxx
```

---

## Subscription Lifecycle

```
                     +--------------------+
                     |   User Registra    |
                     +----------+---------+
                                |
                                v
                     +--------------------+
                     |   FREE Plan        |
                     |   (automatic)      |
                     +----------+---------+
                                |
          User clicks "Upgrade" |
                                v
                     +--------------------+
                     | Stripe Checkout    |
                     | (hosted page)      |
                     +----------+---------+
                                |
        Webhook: subscription.created
                                |
                                v
                     +--------------------+
                     |   PAID Plan        |
                     |   (BASIC/PRO/ENT)  |
                     +----------+---------+
                                |
    +---------------------------+---------------------------+
    |                           |                           |
    v                           v                           v
+----------+            +-------------+            +------------+
| Renewal  |            |   Cancel    |            | Plan Change|
| (auto)   |            |             |            |            |
+----+-----+            +------+------+            +-----+------+
     |                         |                         |
     v                         v                         v
 invoice.                subscription.            subscription.
 payment_                 deleted                  updated
 succeeded               (downgrade               (update limits)
                          to FREE)
```

---

## Backend Implementation

### 1. Stripe Module

**Lokacija**: `apps/api/src/modules/stripe/`

```
stripe/
  stripe.module.ts
  stripe.controller.ts
  stripe.service.ts
  webhook.controller.ts
  dto/
    create-checkout.dto.ts
    create-portal.dto.ts
```

### 2. Create Checkout Session

```typescript
// POST /stripe/checkout
// Body: { priceId, organizationId }
// Returns: { url: string } - Stripe Checkout URL

async createCheckoutSession(orgId: string, priceId: string): Promise<string> {
  const org = await this.prisma.organization.findUnique({
    where: { id: orgId },
    include: { subscription: true },
  });

  // Create or get Stripe Customer
  let customerId = org.stripeCustomerId;
  if (!customerId) {
    const customer = await this.stripe.customers.create({
      email: org.ownerEmail,
      metadata: { organizationId: org.id },
    });
    customerId = customer.id;
    await this.prisma.organization.update({
      where: { id: org.id },
      data: { stripeCustomerId: customerId },
    });
  }

  // Create Checkout Session
  const session = await this.stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${APP_URL}/settings/billing?success=true`,
    cancel_url: `${APP_URL}/settings/billing?canceled=true`,
    metadata: { organizationId: org.id },
  });

  return session.url;
}
```

### 3. Customer Portal

```typescript
// POST /stripe/portal
// Returns: { url: string } - Stripe Billing Portal URL

async createPortalSession(orgId: string): Promise<string> {
  const org = await this.prisma.organization.findUnique({
    where: { id: orgId },
  });

  const session = await this.stripe.billingPortal.sessions.create({
    customer: org.stripeCustomerId,
    return_url: `${APP_URL}/settings/billing`,
  });

  return session.url;
}
```

---

## Webhook Handler

### 4. Webhook Controller

```typescript
// POST /webhooks/stripe
// Raw body + Stripe signature verification

@Post('webhooks/stripe')
async handleWebhook(
  @Req() req: RawBodyRequest<Request>,
  @Headers('stripe-signature') signature: string,
) {
  const event = this.stripe.webhooks.constructEvent(
    req.rawBody,
    signature,
    process.env.STRIPE_WEBHOOK_SECRET,
  );

  switch (event.type) {
    case 'customer.subscription.created':
      await this.handleSubscriptionCreated(event.data.object);
      break;
    case 'customer.subscription.updated':
      await this.handleSubscriptionUpdated(event.data.object);
      break;
    case 'customer.subscription.deleted':
      await this.handleSubscriptionDeleted(event.data.object);
      break;
    case 'invoice.payment_succeeded':
      await this.handlePaymentSucceeded(event.data.object);
      break;
    case 'invoice.payment_failed':
      await this.handlePaymentFailed(event.data.object);
      break;
    case 'invoice.upcoming':
      await this.handleUpcomingInvoice(event.data.object);
      break;
  }

  return { received: true };
}
```

### 5. Webhook Handlers

```typescript
// subscription.created
async handleSubscriptionCreated(subscription: Stripe.Subscription) {
  const orgId = subscription.metadata.organizationId;
  const priceId = subscription.items.data[0].price.id;
  const plan = this.getPlanFromPriceId(priceId);

  await this.prisma.subscription.update({
    where: { organizationId: orgId },
    data: {
      stripeSubscriptionId: subscription.id,
      stripePriceId: priceId,
      plan: plan,
      status: 'ACTIVE',
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      dailyQueryLimit: this.getLimitForPlan(plan),
    },
  });

  // Send welcome email
  await this.emailService.sendSubscriptionWelcome(orgId, plan);
}

// subscription.deleted
async handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const orgId = subscription.metadata.organizationId;

  // Downgrade to FREE
  await this.prisma.subscription.update({
    where: { organizationId: orgId },
    data: {
      plan: 'FREE',
      status: 'CANCELLED',
      stripeSubscriptionId: null,
      stripePriceId: null,
      dailyQueryLimit: 5,
    },
  });

  // Send email
  await this.emailService.sendSubscriptionCancelled(orgId);
}

// invoice.payment_failed
async handlePaymentFailed(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;
  const org = await this.prisma.organization.findFirst({
    where: { stripeCustomerId: customerId },
  });

  await this.prisma.subscription.update({
    where: { organizationId: org.id },
    data: { status: 'PAST_DUE' },
  });

  // Send warning email
  await this.emailService.sendPaymentFailed(org.id);
}

// invoice.upcoming (3 dana prije)
async handleUpcomingInvoice(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;
  const org = await this.prisma.organization.findFirst({
    where: { stripeCustomerId: customerId },
  });

  // Send reminder email
  await this.emailService.sendUpcomingRenewal(org.id, invoice.amount_due / 100);
}
```

---

## Frontend Pages

### 1. Pricing Page

**Ruta**: `/pricing`

```
+----------------------------------------------------------+
|                     Odaberite paket                       |
+----------------------------------------------------------+
|                                                          |
|  +----------+  +----------+  +----------+  +----------+  |
|  |   FREE   |  |  BASIC   |  |   PRO    |  |ENTERPRISE|  |
|  |          |  |          |  | POPULAR  |  |          |  |
|  |   0 EUR  |  | 9.99 EUR |  |19.99 EUR |  |49.99 EUR |  |
|  |          |  |          |  |          |  |          |  |
|  | 5 upita  |  | 50 upita |  |250 upita |  |2000 upita|  |
|  | 1 clan   |  | 3 clana  |  |10 clanova|  |Unlimited |  |
|  |          |  |          |  |          |  |          |  |
|  |[Trenutno]|  |[Odaberi] |  |[Odaberi] |  |[Odaberi] |  |
|  +----------+  +----------+  +----------+  +----------+  |
|                                                          |
+----------------------------------------------------------+
```

### 2. Billing Settings Page

**Ruta**: `/settings/billing`

```
+----------------------------------------------------------+
|  Naplata i pretplata                                     |
+----------------------------------------------------------+
|                                                          |
|  Trenutni paket: PRO                                     |
|  Cijena: 19.99 EUR/mjesec                               |
|  Sljedeca naplata: 15.01.2025                           |
|  Status: Aktivan                                         |
|                                                          |
|  [Promijeni paket]  [Otkazi pretplatu]                  |
|                                                          |
+----------------------------------------------------------+
|  Povijest placanja                                       |
+----------------------------------------------------------+
|  15.12.2024 | PRO | 19.99 EUR | Uspjesno               |
|  15.11.2024 | PRO | 19.99 EUR | Uspjesno               |
|  15.10.2024 | BASIC | 9.99 EUR | Uspjesno              |
+----------------------------------------------------------+
```

### 3. Cancel Confirmation Modal

```
+------------------------------------------+
|  Otkazi pretplatu?                       |
+------------------------------------------+
|                                          |
|  Vasa PRO pretplata ostaje aktivna       |
|  do 15.01.2025.                          |
|                                          |
|  Nakon toga vracate se na FREE paket     |
|  s ogranicenjem od 5 upita dnevno.       |
|                                          |
|  [Odustani]  [Otkazi pretplatu]          |
|                                          |
+------------------------------------------+
```

---

## Email Notifikacije

| Event | Subject | Template |
|-------|---------|----------|
| Subscription created | "Dobrodosli u KPD Pro!" | subscription-welcome.tsx |
| Payment succeeded | "Potvrda placanja - KPD Pro" | payment-receipt.tsx |
| Payment failed | "Problem s placanjem" | payment-failed.tsx |
| Upcoming renewal | "Vasa pretplata se obnavlja" | upcoming-renewal.tsx |
| Subscription cancelled | "Pretplata otkazana" | subscription-cancelled.tsx |
| Downgraded to FREE | "Vratili ste se na besplatni paket" | downgraded.tsx |

---

## API Endpoints

| Method | Endpoint | Auth | Opis |
|--------|----------|------|------|
| GET | /subscription | JWT | Trenutna pretplata |
| POST | /stripe/checkout | JWT | Kreiraj checkout session |
| POST | /stripe/portal | JWT | Kreiraj billing portal |
| POST | /webhooks/stripe | Stripe Sig | Webhook handler |

---

## Checklist

### Stripe Setup
- [ ] Produkti kreirani u Stripe Dashboard
- [ ] Price IDs u .env
- [ ] Webhook konfiguriran
- [ ] Webhook secret u .env

### Backend
- [ ] Stripe module kreiran
- [ ] Checkout endpoint
- [ ] Portal endpoint
- [ ] Webhook handler
- [ ] Subscription CRUD
- [ ] Email notifikacije

### Frontend
- [ ] Pricing page
- [ ] Billing settings page
- [ ] Plan selection component
- [ ] Cancel modal
- [ ] Payment history

### Testing
- [ ] Test checkout flow (test card)
- [ ] Test webhook locally (stripe cli)
- [ ] Test cancel flow
- [ ] Test failed payment

---

## Reference

- **Schema**: [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) - Subscription, PlanConfig modeli
- **Stripe Docs**: https://docs.stripe.com/billing/subscriptions

---

**Sljedeca faza**: [PHASE_4_KPD_TOOL.md](./PHASE_4_KPD_TOOL.md)
