import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Stripe from "stripe";

@Injectable()
export class StripeService {
  private stripe: Stripe;
  private readonly logger = new Logger(StripeService.name);

  constructor(private configService: ConfigService) {
    const secretKey = this.configService.get<string>("STRIPE_SECRET_KEY");
    if (!secretKey) {
      throw new Error("STRIPE_SECRET_KEY is not configured");
    }
    this.stripe = new Stripe(secretKey, {
      apiVersion: "2023-10-16",
    });
  }

  /**
   * Create a payment intent for a booking
   */
  async createPaymentIntent(params: {
    amount: number; // in cents
    currency: string;
    customerId?: string;
    metadata?: Record<string, string>;
    description?: string;
  }): Promise<Stripe.PaymentIntent> {
    try {
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: params.amount,
        currency: params.currency.toLowerCase(),
        customer: params.customerId,
        metadata: params.metadata,
        description: params.description,
        automatic_payment_methods: {
          enabled: true,
        },
      });

      this.logger.log(`PaymentIntent created: ${paymentIntent.id}`);
      return paymentIntent;
    } catch (error) {
      this.logger.error("Failed to create PaymentIntent", error);
      throw error;
    }
  }

  /**
   * Retrieve a payment intent
   */
  async retrievePaymentIntent(paymentIntentId: string): Promise<Stripe.PaymentIntent> {
    try {
      return await this.stripe.paymentIntents.retrieve(paymentIntentId);
    } catch (error) {
      this.logger.error(`Failed to retrieve PaymentIntent: ${paymentIntentId}`, error);
      throw error;
    }
  }

  /**
   * Create or retrieve a Stripe customer
   */
  async createCustomer(params: {
    email: string;
    name?: string;
    phone?: string;
    metadata?: Record<string, string>;
  }): Promise<Stripe.Customer> {
    try {
      const customer = await this.stripe.customers.create({
        email: params.email,
        name: params.name,
        phone: params.phone,
        metadata: params.metadata,
      });

      this.logger.log(`Customer created: ${customer.id}`);
      return customer;
    } catch (error) {
      this.logger.error("Failed to create customer", error);
      throw error;
    }
  }

  /**
   * Construct webhook event from payload
   */
  constructWebhookEvent(
    payload: Buffer,
    signature: string,
    webhookSecret: string
  ): Stripe.Event {
    try {
      return this.stripe.webhooks.constructEvent(
        payload,
        signature,
        webhookSecret
      );
    } catch (error) {
      this.logger.error("Webhook signature verification failed", error);
      throw error;
    }
  }

  /**
   * Create a refund
   */
  async createRefund(params: {
    paymentIntentId: string;
    amount?: number;
    reason?: string;
  }): Promise<Stripe.Refund> {
    try {
      const refund = await this.stripe.refunds.create({
        payment_intent: params.paymentIntentId,
        amount: params.amount,
        reason: params.reason as Stripe.RefundCreateParams.Reason,
      });

      this.logger.log(`Refund created: ${refund.id}`);
      return refund;
    } catch (error) {
      this.logger.error("Failed to create refund", error);
      throw error;
    }
  }
}
