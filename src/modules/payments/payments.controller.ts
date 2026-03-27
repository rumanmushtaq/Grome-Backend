import {
  Controller,
  Post,
  Body,
  Headers,
  Req,
  Res,
  HttpCode,
  HttpStatus,
  UseGuards,
  Get,
  Param,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { Request, Response } from "express";
import { PaymentsService } from "./payments.service";
import { StripeService } from "./stripe.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser } from "@/common/decorators/current-user.decorator";
import { ConfigService } from "@nestjs/config";
import { Logger } from "@nestjs/common";
import { Public } from "@/common/decorators/public.decorator";
import { CreateBookingPaymentDto } from "@/dto/payment/create-payment.dto";

@ApiTags("payments")
@Controller("payments")
export class PaymentsController {
  private readonly logger = new Logger(PaymentsController.name);

  constructor(
    private paymentsService: PaymentsService,
    private stripeService: StripeService,
    private configService: ConfigService,
  ) {}

  /**
   * Stripe webhook handler - NO AUTH REQUIRED
   */
  @Post("webhook")
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Stripe webhook",
    description:
      "Handles Stripe payment events (payment_intent.succeeded, payment_intent.payment_failed)",
  })
  async handleWebhook(
    @Req() req: Request,
    @Res() res: Response,
    @Headers("stripe-signature") signature: string,
  ) {
    const webhookSecret = this.configService.get<string>(
      "STRIPE_WEBHOOK_SECRET",
    );

    if (!webhookSecret) {
      this.logger.error("STRIPE_WEBHOOK_SECRET not configured");
      return res.status(500).send("Webhook secret not configured");
    }

    if (!signature) {
      this.logger.error("No stripe-signature header");
      return res.status(400).send("Missing signature");
    }

    let event;

    try {
      event = this.stripeService.constructWebhookEvent(
        req.body,
        signature,
        webhookSecret,
      );
    } catch (err) {
      this.logger.error(
        `Webhook signature verification failed: ${err.message}`,
      );
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    this.logger.log(`Received Stripe event: ${event.type}`);

    // Handle the event
    switch (event.type) {
      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object as any;
        await this.paymentsService.handlePaymentSuccess(paymentIntent.id);
        break;
      }

      case "payment_intent.payment_failed": {
        const paymentIntent = event.data.object as any;
        await this.paymentsService.handlePaymentFailure(paymentIntent.id);
        break;
      }

      default:
        this.logger.log(`Unhandled event type: ${event.type}`);
    }

    // Return a response to acknowledge receipt of the event
    res.json({ received: true });
  }

  /**
   * Get payment status for a booking
   */
  @Get("booking/:bookingId/status")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get payment status" })
  async getPaymentStatus(
    @CurrentUser() user: { userId: string },
    @Param("bookingId") bookingId: string,
  ) {
    return this.paymentsService.getPaymentStatus(bookingId, user.userId);
  }
}
