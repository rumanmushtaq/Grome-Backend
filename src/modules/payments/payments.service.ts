import { Injectable, Logger, NotFoundException, BadRequestException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { StripeService } from "./stripe.service";
import { Booking, BookingDocument, BookingStatus } from "@/schemas/booking.schema";
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
   * Create a pending booking and initiate Stripe payment
   * Returns client secret for frontend to complete payment
   */
  async createPendingBookingWithPayment(
    customerId: string,
    createBookingDto: any
  ): Promise<{
    booking: any;
    clientSecret: string;
    paymentIntentId: string;
  }> {
    const session = await this.bookingModel.db.startSession();

    try {
      session.startTransaction();

      const {
        barberId,
        services,
        scheduledAt,
        type,
        location,
        specialRequests,
        customerNotes,
        promoCodeId,
      } = createBookingDto;

      // 1. Validate barber
      const barber = await this.barberModel.findById(barberId).session(session).lean();
      if (!barber || !barber.isActive) {
        throw new NotFoundException("Barber not found or inactive");
      }

      // 2. Validate customer
      const customer = await this.userModel.findById(customerId).session(session).lean();
      if (!customer || !customer.isActive) {
        throw new NotFoundException("Customer not found or inactive");
      }

      // 3. Check slot availability (excluding pending_payment bookings that are expired)
      const scheduledDate = new Date(scheduledAt);
      const isAvailable = await this.checkSlotAvailability(barberId, scheduledDate, session);
      if (!isAvailable) {
        throw new BadRequestException("This slot is no longer available");
      }

      // 4. Calculate totals
      const totalAmount = services.reduce((sum: number, s: any) => sum + s.price, 0);
      const commissionRate = barber.commissionRate ?? 0.1; // Default 10%
      const commission = totalAmount * commissionRate;
      const payoutAmount = totalAmount - commission;

      // 5. Create Stripe customer if not exists
      let stripeCustomerId = customer.stripeCustomerId;
      if (!stripeCustomerId) {
        const stripeCustomer = await this.stripeService.createCustomer({
          email: customer.email,
          name: customer.name,
          phone: customer.phone,
          metadata: { userId: customerId },
        });
        stripeCustomerId = stripeCustomer.id;
        
        // Save stripe customer ID to user
        await this.userModel.findByIdAndUpdate(
          customerId,
          { stripeCustomerId },
          { session }
        );
      }

      // 6. Calculate payment expiration (20 minutes from now)
      const paymentExpiresAt = new Date();
      paymentExpiresAt.setMinutes(paymentExpiresAt.getMinutes() + 20);

      // 7. Create booking with pending_payment status
      const [booking] = await this.bookingModel.create(
        [
          {
            customerId: new Types.ObjectId(customerId),
            barberId: new Types.ObjectId(barberId),
            services,
            scheduledAt: scheduledDate,
            type: type || "scheduled",
            location: location
              ? {
                  type: "Point",
                  coordinates: [location.longitude, location.latitude],
                }
              : undefined,
            address: location?.address,
            city: location?.city,
            postalCode: location?.postalCode,
            country: location?.country,
            specialRequests,
            customerNotes,
            promoCodeId: promoCodeId ? new Types.ObjectId(promoCodeId) : undefined,
            status: BookingStatus.PENDING_PAYMENT,
            payment: {
              status: PaymentStatus.PENDING,
              amount: totalAmount,
              currency: "USD",
              commission,
              payoutAmount,
            },
            paymentExpiresAt,
            seatReserved: true,
            source: "mobile_app",
          },
        ],
        { session }
      );

      // 8. Create Stripe Payment Intent
      const paymentIntent = await this.stripeService.createPaymentIntent({
        amount: Math.round(totalAmount * 100), // Convert to cents
        currency: "usd",
        customerId: stripeCustomerId,
        metadata: {
          bookingId: booking._id.toString(),
          customerId,
          barberId,
        },
        description: `Booking #${booking._id} - ${services.map((s: any) => s.name).join(", ")}`,
      });

      // 9. Update booking with payment intent ID
      await this.bookingModel.findByIdAndUpdate(
        booking._id,
        {
          "payment.stripePaymentIntentId": paymentIntent.id,
        },
        { session }
      );

      await session.commitTransaction();

      this.logger.log(`Pending booking created: ${booking._id} with PaymentIntent: ${paymentIntent.id}`);

      return {
        booking: this.mapToResponseDto(booking),
        clientSecret: paymentIntent.client_secret!,
        paymentIntentId: paymentIntent.id,
      };
    } catch (error) {
      await session.abortTransaction();
      this.logger.error("Failed to create pending booking", error);
      throw error;
    } finally {
      session.endSession();
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
      this.logger.warn(`Booking not found for PaymentIntent: ${paymentIntentId}`);
      return;
    }

    if (booking.status !== BookingStatus.PENDING_PAYMENT) {
      this.logger.warn(`Booking ${booking._id} is not in pending_payment status`);
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
      this.logger.warn(`Booking not found for PaymentIntent: ${paymentIntentId}`);
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

      this.logger.log(`Deleted ${expiredBookings.length} expired pending bookings`);
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
    session?: any
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
