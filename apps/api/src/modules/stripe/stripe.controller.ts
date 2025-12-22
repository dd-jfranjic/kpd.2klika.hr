import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  BadRequestException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../admin/admin.guard';
import { StripeService } from './stripe.service';
import { CreateCheckoutSchema } from './dto/create-checkout.dto';
import { CreatePortalSchema } from './dto/create-portal.dto';
import { UpgradeSubscriptionSchema } from './dto/upgrade-subscription.dto';
import { CreateOnetimeCheckoutSchema } from './dto/create-onetime-checkout.dto';
import { PurchaseQueryBoosterSchema } from './dto/purchase-query-booster.dto';
import { GrantBonusQueriesSchema } from './dto/grant-bonus-queries.dto';
import { OrganizationMemberGuard } from './guards';
import { PlanType } from '@prisma/client';

@Controller('stripe')
export class StripeController {
  constructor(private readonly stripeService: StripeService) {}

  /**
   * GET /stripe/plans
   * Dohvati sve dostupne planove
   */
  @Get('plans')
  async getPlans() {
    const plans = await this.stripeService.getPlans();
    return { plans };
  }

  /**
   * GET /stripe/subscription/:organizationId
   * Dohvati trenutnu pretplatu za organizaciju
   * SECURITY: OrganizationMemberGuard provjerava članstvo u organizaciji
   */
  @Get('subscription/:organizationId')
  @UseGuards(JwtAuthGuard, OrganizationMemberGuard)
  async getSubscription(@Param('organizationId') organizationId: string) {
    const subscription = await this.stripeService.getSubscription(organizationId);
    return { subscription };
  }

  /**
   * POST /stripe/checkout
   * Kreiraj Stripe Checkout Session
   * SECURITY: OrganizationMemberGuard provjerava članstvo u organizaciji
   */
  @Post('checkout')
  @UseGuards(JwtAuthGuard, OrganizationMemberGuard)
  @HttpCode(HttpStatus.OK)
  async createCheckout(@Body() body: unknown) {
    // Zod validacija
    const result = CreateCheckoutSchema.safeParse(body);
    if (!result.success) {
      throw new BadRequestException(result.error.errors[0]?.message || 'Nevažeći podaci');
    }

    const { priceId, organizationId, successUrl, cancelUrl } = result.data;
    const session = await this.stripeService.createCheckoutSession(
      organizationId,
      priceId,
      successUrl,
      cancelUrl,
    );

    return session;
  }

  /**
   * POST /stripe/portal
   * Kreiraj Stripe Customer Portal Session
   * SECURITY: OrganizationMemberGuard provjerava članstvo u organizaciji
   */
  @Post('portal')
  @UseGuards(JwtAuthGuard, OrganizationMemberGuard)
  @HttpCode(HttpStatus.OK)
  async createPortal(@Body() body: unknown) {
    // Zod validacija
    const result = CreatePortalSchema.safeParse(body);
    if (!result.success) {
      throw new BadRequestException(result.error.errors[0]?.message || 'Nevažeći podaci');
    }

    const { organizationId, returnUrl } = result.data;
    const session = await this.stripeService.createPortalSession(organizationId, returnUrl);

    return session;
  }

  /**
   * POST /stripe/upgrade
   * Upgrade pretplate na novi plan (s proration)
   * SECURITY: OrganizationMemberGuard provjerava članstvo u organizaciji
   */
  @Post('upgrade')
  @UseGuards(JwtAuthGuard, OrganizationMemberGuard)
  @HttpCode(HttpStatus.OK)
  async upgradeSubscription(@Body() body: unknown) {
    const result = UpgradeSubscriptionSchema.safeParse(body);
    if (!result.success) {
      throw new BadRequestException(result.error.errors[0]?.message || 'Nevažeći podaci');
    }

    const { organizationId, priceId } = result.data;
    return this.stripeService.upgradeSubscription(organizationId, priceId);
  }

  /**
   * POST /stripe/upgrade-preview
   * Preview proration iznosa prije upgrade-a
   * SECURITY: OrganizationMemberGuard provjerava članstvo u organizaciji
   */
  @Post('upgrade-preview')
  @UseGuards(JwtAuthGuard, OrganizationMemberGuard)
  @HttpCode(HttpStatus.OK)
  async getUpgradePreview(@Body() body: unknown) {
    const result = UpgradeSubscriptionSchema.safeParse(body);
    if (!result.success) {
      throw new BadRequestException(result.error.errors[0]?.message || 'Nevažeći podaci');
    }

    const { organizationId, priceId } = result.data;
    return this.stripeService.getUpgradePreview(organizationId, priceId);
  }

  // ============================================
  // ONE-TIME BILLING ENDPOINTS (Added 2025-12-19)
  // ============================================

  /**
   * POST /stripe/checkout-onetime
   * Kreiraj jednokratnu checkout session (payment mode, ne subscription)
   * SECURITY: OrganizationMemberGuard provjerava članstvo u organizaciji
   */
  @Post('checkout-onetime')
  @UseGuards(JwtAuthGuard, OrganizationMemberGuard)
  @HttpCode(HttpStatus.OK)
  async createOnetimeCheckout(@Body() body: unknown) {
    const result = CreateOnetimeCheckoutSchema.safeParse(body);
    if (!result.success) {
      throw new BadRequestException(result.error.errors[0]?.message || 'Nevažeći podaci');
    }

    const { organizationId, plan, successUrl, cancelUrl } = result.data;
    const session = await this.stripeService.createOneTimeCheckoutSession(
      organizationId,
      plan as PlanType,
      successUrl,
      cancelUrl,
    );

    return session;
  }

  /**
   * POST /stripe/query-booster
   * Kupnja Query Booster paketa (10 upita za 6.99 EUR)
   * SECURITY: OrganizationMemberGuard provjerava članstvo u organizaciji
   */
  @Post('query-booster')
  @UseGuards(JwtAuthGuard, OrganizationMemberGuard)
  @HttpCode(HttpStatus.OK)
  async purchaseQueryBooster(@Body() body: unknown) {
    const result = PurchaseQueryBoosterSchema.safeParse(body);
    if (!result.success) {
      throw new BadRequestException(result.error.errors[0]?.message || 'Nevažeći podaci');
    }

    const { organizationId, successUrl, cancelUrl } = result.data;
    const session = await this.stripeService.purchaseQueryBooster(
      organizationId,
      successUrl,
      cancelUrl,
    );

    return session;
  }

  /**
   * GET /stripe/purchases/:organizationId
   * Dohvati povijest kupnji za organizaciju
   * SECURITY: OrganizationMemberGuard provjerava članstvo u organizaciji
   */
  @Get('purchases/:organizationId')
  @UseGuards(JwtAuthGuard, OrganizationMemberGuard)
  async getPurchaseHistory(@Param('organizationId') organizationId: string) {
    const purchases = await this.stripeService.getPurchaseHistory(organizationId);
    return { purchases };
  }

  /**
   * POST /stripe/admin/grant-bonus
   * Admin dodjela bonus upita organizaciji
   * SECURITY: AdminGuard provjerava SUPER_ADMIN ulogu
   */
  @Post('admin/grant-bonus')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @HttpCode(HttpStatus.OK)
  async grantBonusQueries(@Body() body: unknown) {
    const result = GrantBonusQueriesSchema.safeParse(body);
    if (!result.success) {
      throw new BadRequestException(result.error.errors[0]?.message || 'Nevažeći podaci');
    }

    const { organizationId, queriesCount, reason } = result.data;
    const subscription = await this.stripeService.grantBonusQueries(
      organizationId,
      queriesCount,
      reason,
    );

    return {
      success: true,
      message: `Dodijeljeno ${queriesCount} bonus upita`,
      subscription,
    };
  }
}
