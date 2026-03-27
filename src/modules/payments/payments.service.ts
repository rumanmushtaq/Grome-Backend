import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { StripeService } from "./stripe.service";
import {
  Booking,
  BookingDocument,
  BookingStatus,
} from "@/schemas/booking.schema";
import { User, UserDocument } from "@/schemas/user.schema";
import { Barber, BarberDocument } from "@/schemas/barber.schema";
import { PaymentStatus } from "./enums/payment.enum";

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    @InjectModel(Booking.name) private bookingModel: Model<BookingDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Barber.name) private barberModel: Model<BarberDocument>,
    private stripeService: StripeService,
  ) {}

  /**
   * Initialize Stripe payment for a booking
   * Returns client secret for frontend to complete payment
   */
  async initializeBookingPayment(
    booking: BookingDocument,
    customer: UserDocument,
  ): Promise<{
    clientSecret: string;
    paymentIntentId: string;
  }> {
    try {
      // 1. Create Stripe customer if not exists
      let stripeCustomerId = customer.stripeCustomerId;
      if (!stripeCustomerId) {
        const stripeCustomer = await this.stripeService.createCustomer({
          email: customer.email,
          name: customer.name,
          phone: customer.phone,
          metadata: { userId: customer._id.toString() },
        });
        stripeCustomerId = stripeCustomer.id;

        // Save stripe customer ID to user
        await this.userModel.findByIdAndUpdate(customer._id, {
          stripeCustomerId,
        });
      }

      // 2. Create Stripe Payment Intent
      const paymentIntent = await this.stripeService.createPaymentIntent({
        amount: Math.round(booking.payment.amount * 100), // Convert to cents
        currency: booking.payment.currency || "usd",
        customerId: stripeCustomerId,
        metadata: {
          bookingId: booking._id.toString(),
          customerId: booking.customerId.toString(),
          barberId: booking.barberId.toString(),
        },
        description: `Booking #${booking._id} - ${booking.services.map((s: any) => s.name).join(", ")}`,
      });

      return {
        clientSecret: paymentIntent.client_secret!,
        paymentIntentId: paymentIntent.id,
      };
    } catch (error) {
      this.logger.error("Failed to initialize booking payment", error);
      throw error;
    }
  }

  /**
   * Handle successful payment webhook
   */
  async handlePaymentSuccess(paymentIntentId: string): Promise<void> {
    const booking = await this.bookingModel.findOne({
      "payment.stripePaymentIntentId": paymentIntentId,
    });

    if (!booking) {
      this.logger.warn(
        `Booking not found for PaymentIntent: ${paymentIntentId}`,
      );
      return;
    }

    if (booking.status !== BookingStatus.PENDING_PAYMENT) {
      this.logger.warn(
        `Booking ${booking._id} is not in pending_payment status`,
      );
      return;
    }

    // Update booking to confirmed status
    booking.status = BookingStatus.REQUESTED; // Or ACCEPTED depending on your flow
    booking.payment.status = PaymentStatus.COMPLETED;
    booking.seatReserved = true; // Permanent reservation
    booking.paymentExpiresAt = undefined; // Clear expiration

    await booking.save();

    this.logger.log(`Payment confirmed for booking: ${booking._id}`);

    // TODO: Send confirmation notifications
  }

  /**
   * Handle failed payment webhook
   */
  async handlePaymentFailure(paymentIntentId: string): Promise<void> {
    const booking = await this.bookingModel.findOne({
      "payment.stripePaymentIntentId": paymentIntentId,
    });

    if (!booking) {
      this.logger.warn(
        `Booking not found for PaymentIntent: ${paymentIntentId}`,
      );
      return;
    }

    booking.status = BookingStatus.PAYMENT_FAILED;
    booking.payment.status = PaymentStatus.FAILED;
    booking.seatReserved = false;

    await booking.save();

    this.logger.log(`Payment failed for booking: ${booking._id}`);
  }

  /**
   * Delete expired pending bookings (called by cron job)
   */
  async deleteExpiredPendingBookings(): Promise<{
    deletedCount: number;
    bookings: string[];
  }> {
    const now = new Date();

    const expiredBookings = await this.bookingModel.find({
      status: BookingStatus.PENDING_PAYMENT,
      paymentExpiresAt: { $lt: now },
    });

    const bookingIds = expiredBookings.map((b) => b._id.toString());

    if (expiredBookings.length > 0) {
      await this.bookingModel.deleteMany({
        _id: { $in: expiredBookings.map((b) => b._id) },
      });

      this.logger.log(
        `Deleted ${expiredBookings.length} expired pending bookings`,
      );
    }

    return {
      deletedCount: expiredBookings.length,
      bookings: bookingIds,
    };
  }

  /**
   * Check if slot is available (excluding expired pending bookings)
   */
  private async checkSlotAvailability(
    barberId: string,
    scheduledAt: Date,
    session?: any,
  ): Promise<boolean> {
    const now = new Date();

    const conflictingBooking = await this.bookingModel
      .findOne({
        barberId: new Types.ObjectId(barberId),
        scheduledAt: {
          $gte: new Date(scheduledAt.getTime() - 30 * 60 * 1000),
          $lte: new Date(scheduledAt.getTime() + 30 * 60 * 1000),
        },
        $or: [
          // Confirmed bookings
          {
            status: {
              $in: [
                BookingStatus.REQUESTED,
                BookingStatus.ACCEPTED,
                BookingStatus.IN_PROGRESS,
              ],
            },
          },
          // Pending bookings that haven't expired yet
          {
            status: BookingStatus.PENDING_PAYMENT,
            paymentExpiresAt: { $gt: now },
          },
        ],
      })
      .session(session)
      .lean();

    return !conflictingBooking;
  }

  private mapToResponseDto(booking: any): any {
    return {
      id: booking._id?.toString(),
      customerId: booking.customerId?.toString(),
      barberId: booking.barberId?.toString(),
      services: booking.services,
      scheduledAt: booking.scheduledAt,
      status: booking.status,
      type: booking.type,
      location: booking.location,
      payment: booking.payment,
      paymentExpiresAt: booking.paymentExpiresAt,
      seatReserved: booking.seatReserved,
      createdAt: booking.createdAt,
    };
  }
}
