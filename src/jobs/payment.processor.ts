import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import Stripe from 'stripe';
import { ConfigService } from '@nestjs/config';

import { NotificationsService } from '../modules/notifications/notifications.service';

@Processor('payments')
export class PaymentProcessor {
  private readonly logger = new Logger(PaymentProcessor.name);
  private stripe: Stripe;

  constructor(
    private readonly configService: ConfigService,
    private readonly notificationsService: NotificationsService,
  ) {
    this.stripe = new Stripe(this.configService.get('stripe.secretKey'), {
      apiVersion: '2023-10-16',
    });
  }

  @Process('process-payment')
  async handleProcessPayment(job: any) {
    this.logger.log(`Processing payment job: ${job.id}`);
    
    const { bookingId, amount, currency, paymentMethodId, customerId } = job.data;
    
    try {
      // Create payment intent
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: currency || 'usd',
        payment_method: paymentMethodId,
        customer: customerId,
        confirm: true,
        metadata: {
          bookingId,
        },
      });

      if (paymentIntent.status === 'succeeded') {
        // Send success notification
        await this.notificationsService.sendPaymentNotification({
          userId: customerId,
          type: 'payment_success' as any,
          bookingId,
          amount,
          status: 'completed',
        });

        this.logger.log(`Payment processed successfully for booking ${bookingId}`);
      } else {
        throw new Error(`Payment failed with status: ${paymentIntent.status}`);
      }

    } catch (error) {
      this.logger.error(`Payment processing failed for booking ${bookingId}:`, error);
      
      // Send failure notification
      await this.notificationsService.sendPaymentNotification({
        userId: customerId,
        type: 'payment_failed' as any,
        bookingId,
        amount,
        status: 'failed',
      });

      throw error;
    }
  }

  @Process('process-refund')
  async handleProcessRefund(job: any) {
    this.logger.log(`Processing refund job: ${job.id}`);
    
    const { paymentIntentId, amount, reason, bookingId, customerId } = job.data;
    
    try {
      const refund = await this.stripe.refunds.create({
        payment_intent: paymentIntentId,
        amount: Math.round(amount * 100), // Convert to cents
        reason: reason || 'requested_by_customer',
        metadata: {
          bookingId,
        },
      });

      if (refund.status === 'succeeded') {
        // Send refund notification
        await this.notificationsService.sendPaymentNotification({
          userId: customerId,
          type: 'payment_refund' as any,
          bookingId,
          amount,
          status: 'refunded',
        });

        this.logger.log(`Refund processed successfully for booking ${bookingId}`);
      } else {
        throw new Error(`Refund failed with status: ${refund.status}`);
      }

    } catch (error) {
      this.logger.error(`Refund processing failed for booking ${bookingId}:`, error);
      throw error;
    }
  }

  @Process('process-payout')
  async handleProcessPayout(job: any) {
    this.logger.log(`Processing payout job: ${job.id}`);
    
    const { barberId, amount, bankAccountId, bookingId } = job.data;
    
    try {
      // Create transfer to barber's bank account
      const transfer = await this.stripe.transfers.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: 'usd',
        destination: bankAccountId,
        metadata: {
          barberId,
          bookingId,
        },
      });

      this.logger.log(`Payout processed successfully for barber ${barberId}: ${transfer.id}`);

    } catch (error) {
      this.logger.error(`Payout processing failed for barber ${barberId}:`, error);
      throw error;
    }
  }

  @Process('handle-webhook')
  async handleWebhook(job: any) {
    this.logger.log(`Processing webhook job: ${job.id}`);
    
    const { event } = job.data;
    
    try {
      switch (event.type) {
        case 'payment_intent.succeeded':
          await this.handlePaymentIntentSucceeded(event);
          break;
        case 'payment_intent.payment_failed':
          await this.handlePaymentIntentFailed(event);
          break;
        case 'charge.dispute.created':
          await this.handleChargeDispute(event);
          break;
        default:
          this.logger.log(`Unhandled webhook event type: ${event.type}`);
      }

    } catch (error) {
      this.logger.error(`Webhook processing failed for event ${event.id}:`, error);
      throw error;
    }
  }

  private async handlePaymentIntentSucceeded(event: any) {
    const paymentIntent = event.data.object;
    const bookingId = paymentIntent.metadata.bookingId;
    
    if (bookingId) {
      // Update booking payment status
      // TODO: Update booking in database
      this.logger.log(`Payment succeeded for booking ${bookingId}`);
    }
  }

  private async handlePaymentIntentFailed(event: any) {
    const paymentIntent = event.data.object;
    const bookingId = paymentIntent.metadata.bookingId;
    
    if (bookingId) {
      // Update booking payment status
      // TODO: Update booking in database
      this.logger.log(`Payment failed for booking ${bookingId}`);
    }
  }

  private async handleChargeDispute(event: any) {
    const dispute = event.data.object;
    this.logger.warn(`Charge dispute created: ${dispute.id}`);
    
    // TODO: Handle dispute - notify admin, update booking status
  }
}
