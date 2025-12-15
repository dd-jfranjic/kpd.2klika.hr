import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { PrismaService } from '../../prisma/prisma.service';
import { PlanType, SubscriptionStatus } from '@prisma/client';

@Injectable()
export class StripeService {
  private readonly stripe: Stripe;
  private readonly logger = new Logger(StripeService.name);
  private readonly appUrl: string;

  // Price IDs iz konfiguracije
  private readonly priceIds: Record<string, string>;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const secretKey = this.config.get<string>('STRIPE_SECRET_KEY');
    if (!secretKey || secretKey === 'sk_test_REPLACE_ME') {
      this.logger.warn('Stripe secret key nije konfiguriran!');
    }

    this.stripe = new Stripe(secretKey || '', {
      apiVersion: '2025-02-24.acacia',
    });

    this.appUrl = this.config.get<string>('APP_URL') || 'https://kpd.2klika.hr';

    this.priceIds = {
      BASIC: this.config.get<string>('STRIPE_PRICE_BASIC') || '',
      PRO: this.config.get<string>('STRIPE_PRICE_PRO') || '',
      BUSINESS: this.config.get<string>('STRIPE_PRICE_BUSINESS') || '',
      ENTERPRISE: this.config.get<string>('STRIPE_PRICE_ENTERPRISE') || '',
    };
  }

  /**
   * Dohvati ili kreiraj Stripe Customer za organizaciju
   */
  async getOrCreateCustomer(organizationId: string): Promise<string> {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      include: {
        members: {
          where: { role: 'OWNER' },
          include: { user: true },
          take: 1,
        },
      },
    });

    if (!org) {
      throw new NotFoundException('Organizacija nije pronađena');
    }

    // Ako već postoji Stripe Customer
    if (org.stripeCustomerId) {
      return org.stripeCustomerId;
    }

    // Kreiraj novog Stripe Customer-a
    const ownerEmail = org.members[0]?.user?.email || 'unknown@kpd.2klika.hr';

    const customer = await this.stripe.customers.create({
      email: ownerEmail,
      name: org.name,
      metadata: {
        organizationId: org.id,
        organizationSlug: org.slug,
      },
    });

    // Spremi customer ID u bazu
    await this.prisma.organization.update({
      where: { id: organizationId },
      data: { stripeCustomerId: customer.id },
    });

    this.logger.log(`Kreiran Stripe Customer ${customer.id} za organizaciju ${org.name}`);

    return customer.id;
  }

  /**
   * Kreiraj Stripe Checkout Session za subscription
   */
  async createCheckoutSession(
    organizationId: string,
    priceId: string,
    successUrl?: string,
    cancelUrl?: string,
  ): Promise<{ url: string }> {
    const customerId = await this.getOrCreateCustomer(organizationId);

    // Provjeri postoji li već aktivna pretplata
    const existingSubscription = await this.prisma.subscription.findUnique({
      where: { organizationId },
    });

    if (existingSubscription?.stripeSubscriptionId && existingSubscription.status === 'ACTIVE') {
      throw new BadRequestException(
        'Već imate aktivnu pretplatu. Koristite portal za promjenu plana.',
      );
    }

    const session = await this.stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: successUrl || `${this.appUrl}/settings/billing?success=true`,
      cancel_url: cancelUrl || `${this.appUrl}/settings/billing?canceled=true`,
      metadata: {
        organizationId,
      },
      subscription_data: {
        metadata: {
          organizationId,
        },
      },
      allow_promotion_codes: true,
      billing_address_collection: 'required',
      tax_id_collection: {
        enabled: true,
      },
      // Dozvoli Stripe-u da ažurira customer podatke iz checkout forme
      // Potrebno za tax_id_collection s postojećim customerom
      customer_update: {
        name: 'auto',
        address: 'auto',
      },
    });

    if (!session.url) {
      throw new BadRequestException('Nije moguće kreirati checkout session');
    }

    this.logger.log(`Kreiran Checkout Session za organizaciju ${organizationId}`);

    return { url: session.url };
  }

  /**
   * Kreiraj Stripe Customer Portal Session
   */
  async createPortalSession(
    organizationId: string,
    returnUrl?: string,
  ): Promise<{ url: string }> {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!org?.stripeCustomerId) {
      throw new BadRequestException('Nema povezanog Stripe računa');
    }

    const session = await this.stripe.billingPortal.sessions.create({
      customer: org.stripeCustomerId,
      return_url: returnUrl || `${this.appUrl}/settings/billing`,
    });

    this.logger.log(`Kreiran Portal Session za organizaciju ${organizationId}`);

    return { url: session.url };
  }

  /**
   * Dohvati subscription za organizaciju
   */
  async getSubscription(organizationId: string) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { organizationId },
    });

    if (!subscription) {
      // Vrati default FREE subscription
      return {
        plan: 'FREE',
        status: 'ACTIVE',
        dailyQueryLimit: 5,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
      };
    }

    // Dohvati plan config za više detalja
    const planConfig = await this.prisma.planConfig.findUnique({
      where: { plan: subscription.plan },
    });

    return {
      ...subscription,
      planConfig,
    };
  }

  /**
   * Dohvati dostupne planove
   */
  async getPlans() {
    const plans = await this.prisma.planConfig.findMany({
      orderBy: { sortOrder: 'asc' },
    });

    return plans.map((plan) => ({
      ...plan,
      priceId: this.priceIds[plan.plan] || null,
    }));
  }

  /**
   * Upgrade subscription na novi plan
   * Koristi Stripe proration - automatski računa razliku
   */
  async upgradeSubscription(
    organizationId: string,
    newPriceId: string,
  ): Promise<{ success: boolean; message: string; prorationAmount?: number }> {
    // Dohvati trenutnu pretplatu
    const subscription = await this.prisma.subscription.findUnique({
      where: { organizationId },
    });

    if (!subscription?.stripeSubscriptionId) {
      throw new BadRequestException('Nemate aktivnu pretplatu za upgrade');
    }

    // Dohvati Stripe subscription
    const stripeSubscription = await this.stripe.subscriptions.retrieve(
      subscription.stripeSubscriptionId,
    );

    if (stripeSubscription.status !== 'active') {
      throw new BadRequestException('Pretplata nije aktivna');
    }

    // Provjeri da novi plan nije isti kao trenutni
    const currentPriceId = stripeSubscription.items.data[0]?.price.id;
    if (currentPriceId === newPriceId) {
      throw new BadRequestException('Već ste na ovom planu');
    }

    // Validiraj da je newPriceId validan
    const newPlan = this.getPlanFromPriceId(newPriceId);
    if (newPlan === 'FREE') {
      throw new BadRequestException('Nije moguće upgrade na FREE plan. Koristite portal za otkazivanje.');
    }

    // Dohvati subscription item ID
    const subscriptionItemId = stripeSubscription.items.data[0]?.id;
    if (!subscriptionItemId) {
      throw new BadRequestException('Ne mogu pronaći subscription item');
    }

    // Napravi proration preview (opcionalno - za prikaz korisniku)
    const upcomingInvoice = await this.stripe.invoices.retrieveUpcoming({
      customer: stripeSubscription.customer as string,
      subscription: subscription.stripeSubscriptionId,
      subscription_items: [
        {
          id: subscriptionItemId,
          price: newPriceId,
        },
      ],
      subscription_proration_behavior: 'create_prorations',
    });

    const prorationAmount = upcomingInvoice.total / 100; // Convert cents to EUR

    // Ažuriraj subscription - Stripe automatski računa proration
    await this.stripe.subscriptions.update(subscription.stripeSubscriptionId, {
      items: [
        {
          id: subscriptionItemId,
          price: newPriceId,
        },
      ],
      proration_behavior: 'create_prorations', // Automatska proration
      payment_behavior: 'error_if_incomplete', // Fail ako kartica ne prolazi
    });

    // Dohvati planConfig za novi plan
    const planConfig = await this.prisma.planConfig.findUnique({
      where: { plan: newPlan },
    });

    // Ažuriraj lokalnu bazu - ODMAH primjeni novi limit
    // currentPeriodStart se postavlja na SADA jer korisnik dobiva nove kredite odmah
    await this.prisma.subscription.update({
      where: { organizationId },
      data: {
        plan: newPlan,
        stripePriceId: newPriceId,
        dailyQueryLimit: planConfig?.dailyQueryLimit ?? 5,
        monthlyQueryLimit: planConfig?.monthlyQueryLimit ?? planConfig?.dailyQueryLimit ?? 5,
        currentPeriodStart: new Date(), // Reset perioda za usage counting
      },
    });

    this.logger.log(
      `Upgrade pretplate za organizaciju ${organizationId}: ${subscription.plan} → ${newPlan} (proration: ${prorationAmount}€)`,
    );

    return {
      success: true,
      message: `Uspješno ste nadogradili na ${newPlan} plan!`,
      prorationAmount,
    };
  }

  /**
   * Dohvati proration preview bez izvršenja upgrade-a
   */
  async getUpgradePreview(
    organizationId: string,
    newPriceId: string,
  ): Promise<{ prorationAmount: number; newPlan: string }> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { organizationId },
    });

    if (!subscription?.stripeSubscriptionId) {
      throw new BadRequestException('Nemate aktivnu pretplatu');
    }

    const stripeSubscription = await this.stripe.subscriptions.retrieve(
      subscription.stripeSubscriptionId,
    );

    const subscriptionItemId = stripeSubscription.items.data[0]?.id;
    if (!subscriptionItemId) {
      throw new BadRequestException('Ne mogu pronaći subscription item');
    }

    const upcomingInvoice = await this.stripe.invoices.retrieveUpcoming({
      customer: stripeSubscription.customer as string,
      subscription: subscription.stripeSubscriptionId,
      subscription_items: [
        {
          id: subscriptionItemId,
          price: newPriceId,
        },
      ],
      subscription_proration_behavior: 'create_prorations',
    });

    const newPlan = this.getPlanFromPriceId(newPriceId);

    return {
      prorationAmount: upcomingInvoice.total / 100,
      newPlan,
    };
  }

  // ============================================
  // WEBHOOK HANDLERS
  // ============================================

  /**
   * Obradi webhook event
   */
  async handleWebhookEvent(event: Stripe.Event): Promise<void> {
    this.logger.log(`Obrada webhook eventa: ${event.type}`);

    switch (event.type) {
      case 'customer.subscription.created':
        await this.handleSubscriptionCreated(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.updated':
        await this.handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.deleted':
        await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      case 'invoice.payment_succeeded':
        await this.handlePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;

      case 'invoice.payment_failed':
        await this.handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      case 'invoice.upcoming':
        await this.handleUpcomingInvoice(event.data.object as Stripe.Invoice);
        break;

      default:
        this.logger.debug(`Neobradeni webhook event: ${event.type}`);
    }
  }

  /**
   * Handler: Subscription Created
   */
  private async handleSubscriptionCreated(subscription: Stripe.Subscription): Promise<void> {
    let organizationId = subscription.metadata.organizationId;

    // Fallback: ako nema metadata, pronađi organizaciju preko stripeCustomerId
    if (!organizationId) {
      const org = await this.prisma.organization.findFirst({
        where: { stripeCustomerId: subscription.customer as string },
      });
      if (!org) {
        this.logger.error('Subscription bez organizationId metadata i ne mogu pronaći organizaciju preko customer ID');
        return;
      }
      organizationId = org.id;
      this.logger.warn(`Pronađena organizacija ${organizationId} preko stripeCustomerId (nedostaje metadata)`);
    }

    const priceId = subscription.items.data[0]?.price.id;
    const plan = this.getPlanFromPriceId(priceId);
    const planConfig = await this.prisma.planConfig.findUnique({
      where: { plan },
    });

    await this.prisma.subscription.upsert({
      where: { organizationId },
      create: {
        organizationId,
        stripeSubscriptionId: subscription.id,
        stripePriceId: priceId,
        plan,
        status: this.mapStripeStatus(subscription.status),
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        dailyQueryLimit: planConfig?.dailyQueryLimit ?? 5,
        monthlyQueryLimit: planConfig?.monthlyQueryLimit ?? planConfig?.dailyQueryLimit ?? 5,
      },
      update: {
        stripeSubscriptionId: subscription.id,
        stripePriceId: priceId,
        plan,
        status: this.mapStripeStatus(subscription.status),
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        dailyQueryLimit: planConfig?.dailyQueryLimit ?? 5,
        monthlyQueryLimit: planConfig?.monthlyQueryLimit ?? planConfig?.dailyQueryLimit ?? 5,
      },
    });

    this.logger.log(`Kreirana/ažurirana pretplata za organizaciju ${organizationId}: ${plan}`);

    // TODO: Pošalji welcome email
  }

  /**
   * Handler: Subscription Updated
   *
   * VAŽNO: Ne prepisujemo currentPeriodStart ako je plan promijenjen (upgrade/downgrade)
   * jer naš upgradeSubscription() postavlja currentPeriodStart = now() za reset usage-a.
   * Webhook bi prepisao tu vrijednost sa Stripe-ovim billing periodom što bi pokvarilo usage tracking.
   */
  private async handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
    const organizationId = subscription.metadata.organizationId;
    if (!organizationId) {
      // Pokušaj pronaći organizaciju preko customer ID
      const org = await this.prisma.organization.findFirst({
        where: { stripeCustomerId: subscription.customer as string },
      });
      if (!org) {
        this.logger.error('Ne mogu pronaći organizaciju za subscription update');
        return;
      }
      await this.handleSubscriptionCreated({
        ...subscription,
        metadata: { ...subscription.metadata, organizationId: org.id },
      });
      return;
    }

    const priceId = subscription.items.data[0]?.price.id;
    let plan = this.getPlanFromPriceId(priceId);

    // Ako je subscription status 'canceled', downgrade na FREE
    if (subscription.status === 'canceled') {
      plan = 'FREE';
      this.logger.log(`Subscription otkazan - downgrade na FREE za organizaciju ${organizationId}`);
    }

    const planConfig = await this.prisma.planConfig.findUnique({
      where: { plan },
    });

    // Dohvati trenutnu pretplatu da provjerimo je li se plan promijenio
    const currentSubscription = await this.prisma.subscription.findUnique({
      where: { organizationId },
    });

    const planChanged = currentSubscription && currentSubscription.plan !== plan;

    await this.prisma.subscription.update({
      where: { organizationId },
      data: {
        stripePriceId: subscription.status === 'canceled' ? null : priceId,
        plan,
        status: this.mapStripeStatus(subscription.status),
        // NE PREPISUJ currentPeriodStart ako se plan promijenio!
        // upgradeSubscription() je već postavio ovu vrijednost za reset usage-a
        ...(!planChanged && {
          currentPeriodStart: new Date(subscription.current_period_start * 1000),
        }),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        dailyQueryLimit: planConfig?.dailyQueryLimit ?? 5,
        monthlyQueryLimit: planConfig?.monthlyQueryLimit ?? planConfig?.dailyQueryLimit ?? 5,
        // Očisti Stripe ID ako je otkazan
        ...(subscription.status === 'canceled' && { stripeSubscriptionId: null }),
      },
    });

    this.logger.log(`Ažurirana pretplata za organizaciju ${organizationId}: ${plan}${planChanged ? ' (plan changed - keeping currentPeriodStart)' : ''}`);
  }

  /**
   * Handler: Subscription Deleted (cancelled)
   */
  private async handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
    const organizationId = subscription.metadata.organizationId;

    // Pokušaj pronaći organizaciju preko customer ID ako nema metadata
    let orgId = organizationId;
    if (!orgId) {
      const org = await this.prisma.organization.findFirst({
        where: { stripeCustomerId: subscription.customer as string },
      });
      if (!org) {
        this.logger.error('Ne mogu pronaći organizaciju za subscription delete');
        return;
      }
      orgId = org.id;
    }

    // Downgrade na FREE
    await this.prisma.subscription.update({
      where: { organizationId: orgId },
      data: {
        plan: 'FREE',
        status: 'CANCELLED',
        stripeSubscriptionId: null,
        stripePriceId: null,
        dailyQueryLimit: 5,
        monthlyQueryLimit: null,
        cancelAtPeriodEnd: false,
      },
    });

    this.logger.log(`Pretplata otkazana za organizaciju ${orgId}, downgrade na FREE`);

    // TODO: Pošalji email o otkazu
  }

  /**
   * Handler: Payment Succeeded
   */
  private async handlePaymentSucceeded(invoice: Stripe.Invoice): Promise<void> {
    const customerId = invoice.customer as string;
    const org = await this.prisma.organization.findFirst({
      where: { stripeCustomerId: customerId },
    });

    if (!org) {
      this.logger.warn(`Ne mogu pronaći organizaciju za customer ${customerId}`);
      return;
    }

    // Osiguraj da je status ACTIVE
    await this.prisma.subscription.updateMany({
      where: { organizationId: org.id },
      data: { status: 'ACTIVE' },
    });

    this.logger.log(`Uspješno plaćanje za organizaciju ${org.id}`);

    // TODO: Pošalji potvrdu plaćanja email
  }

  /**
   * Handler: Payment Failed
   */
  private async handlePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
    const customerId = invoice.customer as string;
    const org = await this.prisma.organization.findFirst({
      where: { stripeCustomerId: customerId },
    });

    if (!org) {
      this.logger.warn(`Ne mogu pronaći organizaciju za customer ${customerId}`);
      return;
    }

    await this.prisma.subscription.updateMany({
      where: { organizationId: org.id },
      data: { status: 'PAST_DUE' },
    });

    this.logger.warn(`Neuspješno plaćanje za organizaciju ${org.id}`);

    // TODO: Pošalji upozorenje email
  }

  /**
   * Handler: Upcoming Invoice (3 dana prije)
   */
  private async handleUpcomingInvoice(invoice: Stripe.Invoice): Promise<void> {
    const customerId = invoice.customer as string;
    const org = await this.prisma.organization.findFirst({
      where: { stripeCustomerId: customerId },
    });

    if (!org) {
      return;
    }

    this.logger.log(`Nadolazeća faktura za organizaciju ${org.id}: ${invoice.amount_due / 100} EUR`);

    // TODO: Pošalji podsjetnik email
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  /**
   * Mapiraj Stripe price ID na PlanType
   */
  private getPlanFromPriceId(priceId: string): PlanType {
    if (priceId === this.priceIds.BASIC) return 'BASIC';
    if (priceId === this.priceIds.PRO) return 'PRO';
    if (priceId === this.priceIds.BUSINESS) return 'BUSINESS';
    if (priceId === this.priceIds.ENTERPRISE) return 'ENTERPRISE';
    return 'FREE';
  }

  /**
   * Mapiraj Stripe subscription status na SubscriptionStatus
   */
  private mapStripeStatus(status: Stripe.Subscription.Status): SubscriptionStatus {
    switch (status) {
      case 'active':
        return 'ACTIVE';
      case 'past_due':
        return 'PAST_DUE';
      case 'canceled':
        return 'CANCELLED';
      case 'trialing':
        return 'TRIALING';
      case 'paused':
        return 'PAUSED';
      default:
        return 'ACTIVE';
    }
  }

  /**
   * Verificiraj Stripe webhook signature
   */
  verifyWebhookSignature(payload: Buffer, signature: string): Stripe.Event {
    const webhookSecret = this.config.get<string>('STRIPE_WEBHOOK_SECRET');
    if (!webhookSecret || webhookSecret === 'whsec_REPLACE_ME') {
      throw new BadRequestException('Webhook secret nije konfiguriran');
    }

    try {
      return this.stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      this.logger.error(`Webhook signature verification failed: ${message}`);
      throw new BadRequestException('Nevažeći webhook signature');
    }
  }
}
