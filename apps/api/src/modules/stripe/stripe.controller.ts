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
import { StripeService } from './stripe.service';
import { CreateCheckoutSchema } from './dto/create-checkout.dto';
import { CreatePortalSchema } from './dto/create-portal.dto';
import { UpgradeSubscriptionSchema } from './dto/upgrade-subscription.dto';
import { OrganizationMemberGuard } from './guards';

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
}
