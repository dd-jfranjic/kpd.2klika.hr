import {
  Controller,
  Post,
  Headers,
  Req,
  BadRequestException,
  HttpCode,
  HttpStatus,
  Logger,
  RawBodyRequest,
} from '@nestjs/common';
import { Request } from 'express';
import { StripeService } from './stripe.service';

@Controller('webhooks')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  constructor(private readonly stripeService: StripeService) {}

  /**
   * POST /webhooks/stripe
   * Stripe webhook handler
   *
   * VAZNO: Ovaj endpoint zahtijeva raw body za signature verification
   * NestJS treba biti konfiguriran da salva raw body za ovaj endpoint
   */
  @Post('stripe')
  @HttpCode(HttpStatus.OK)
  async handleStripeWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ) {
    if (!signature) {
      this.logger.error('Nedostaje stripe-signature header');
      throw new BadRequestException('Nedostaje signature');
    }

    const rawBody = req.rawBody;
    if (!rawBody) {
      this.logger.error('Nedostaje raw body za webhook');
      throw new BadRequestException('Nedostaje body');
    }

    try {
      // Verificiraj signature i parsiraj event
      const event = this.stripeService.verifyWebhookSignature(rawBody, signature);

      // Obradi event
      await this.stripeService.handleWebhookEvent(event);

      return { received: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Webhook error: ${message}`);
      throw new BadRequestException(message);
    }
  }
}
