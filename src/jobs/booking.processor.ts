import { Process, Processor } from "@nestjs/bull";
import { Logger } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";

import { NotificationsService } from "../modules/notifications/notifications.service";
import {
  Booking,
  BookingDocument,
  BookingStatus,
} from "@/schemas/booking.schema";

@Processor("bookings")
export class BookingProcessor {
  private readonly logger = new Logger(BookingProcessor.name);

  constructor(
    private readonly notificationsService: NotificationsService,
    @InjectModel(Booking.name) private bookingModel: Model<BookingDocument>,
  ) {}

  @Process("send-booking-reminder")
  async handleSendBookingReminder(job: any) {
    this.logger.log(`Processing booking reminder job: ${job.id}`);

    const {
      bookingId,
      customerId,
      barberId,
      scheduledAt,
      customerName,
      barberName,
    } = job.data;

    try {
      // Send reminder to customer
      await this.notificationsService.sendBookingNotification({
        userId: customerId,
        type: "booking_reminder" as any,
        bookingId,
        title: "Booking Reminder",
        body: `Your appointment with ${barberName} is tomorrow at ${new Date(scheduledAt).toLocaleString()}`,
        data: { scheduledAt, barberName },
      });

      // Send reminder to barber
      await this.notificationsService.sendBookingNotification({
        userId: barberId,
        type: "booking_reminder" as any,
        bookingId,
        title: "Booking Reminder",
        body: `You have an appointment with ${customerName} tomorrow at ${new Date(scheduledAt).toLocaleString()}`,
        data: { scheduledAt, customerName },
      });

      this.logger.log(`Booking reminder sent for booking ${bookingId}`);
    } catch (error) {
      this.logger.error(
        `Failed to send booking reminder for ${bookingId}:`,
        error,
      );
      throw error;
    }
  }

  @Process("cleanup-expired-bookings")
  async handleCleanupExpiredBookings(job: any) {
    this.logger.log(`Processing cleanup expired bookings job: ${job.id}`);

    try {
      // Find bookings that are past their scheduled time and still in 'requested' status
      const expired = await this.bookingModel.find({
        status: BookingStatus.REQUESTED,
        scheduledAt: { $lt: new Date() },
      });

      for (const booking of expired) {
        booking.status = BookingStatus.CANCELLED;
        booking.cancellationReason =
          "System: Appointment time passed without acceptance";
        await booking.save();

        // Notify customer
        await this.notificationsService.sendBookingNotification({
          userId: booking.customerId.toString(),
          type: "booking_cancelled" as any,
          bookingId: booking._id.toString(),
          title: "Booking Expired",
          body: "Your booking request expired as it was not accepted in time.",
        });
      }

      this.logger.log(
        `Expired bookings cleanup completed. Processed ${expired.length} bookings.`,
      );
    } catch (error) {
      this.logger.error("Failed to cleanup expired bookings:", error);
      throw error;
    }
  }

  @Process("delete-expired-booking")
  async handleBookingExpiry(job: any) {
    const { bookingId } = job.data;
    this.logger.log(`Checking expiry for booking: ${bookingId}`);

    try {
      const booking = await this.bookingModel.findById(bookingId);

      if (booking && booking.status === BookingStatus.PENDING_PAYMENT) {
        await this.bookingModel.findByIdAndDelete(bookingId);
        this.logger.log(`Deleted unpaid expired booking: ${bookingId}`);
      }
    } catch (error) {
      this.logger.error(
        `Failed to process booking expiry for ${bookingId}:`,
        error,
      );
      throw error;
    }
  }

  @Process("send-booking-confirmation")
  async handleSendBookingConfirmation(job: any) {
    this.logger.log(`Processing booking confirmation job: ${job.id}`);

    const {
      bookingId,
      customerId,
      barberId,
      scheduledAt,
      services,
      customerName,
      barberName,
    } = job.data;

    try {
      // Send confirmation to customer
      await this.notificationsService.sendBookingNotification({
        userId: customerId,
        type: "booking_created" as any,
        bookingId,
        title: "Booking Confirmed",
        body: `Your appointment with ${barberName} has been confirmed for ${new Date(scheduledAt).toLocaleString()}`,
        data: { scheduledAt, barberName, services },
      });

      // Send notification to barber
      await this.notificationsService.sendBookingNotification({
        userId: barberId,
        type: "booking_created" as any,
        bookingId,
        title: "New Booking Request",
        body: `${customerName} has requested an appointment for ${new Date(scheduledAt).toLocaleString()}`,
        data: { scheduledAt, customerName, services },
      });

      this.logger.log(`Booking confirmation sent for booking ${bookingId}`);
    } catch (error) {
      this.logger.error(
        `Failed to send booking confirmation for ${bookingId}:`,
        error,
      );
      throw error;
    }
  }

  @Process("send-booking-cancellation")
  async handleSendBookingCancellation(job: any) {
    this.logger.log(`Processing booking cancellation job: ${job.id}`);

    const {
      bookingId,
      customerId,
      barberId,
      reason,
      cancelledBy,
      customerName,
      barberName,
    } = job.data;

    try {
      // Send cancellation notification to both parties
      const notificationData = {
        bookingId,
        title: "Booking Cancelled",
        body: `Your appointment has been cancelled${reason ? `: ${reason}` : ""}`,
        data: { reason, cancelledBy },
      };

      await this.notificationsService.sendBookingNotification({
        userId: customerId,
        type: "booking_cancelled" as any,
        ...notificationData,
      });

      await this.notificationsService.sendBookingNotification({
        userId: barberId,
        type: "booking_cancelled" as any,
        ...notificationData,
      });

      this.logger.log(
        `Booking cancellation notification sent for booking ${bookingId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send booking cancellation for ${bookingId}:`,
        error,
      );
      throw error;
    }
  }

  @Process("send-booking-completion")
  async handleSendBookingCompletion(job: any) {
    this.logger.log(`Processing booking completion job: ${job.id}`);

    const { bookingId, customerId, barberId, customerName, barberName } =
      job.data;

    try {
      // Send completion notification to customer
      await this.notificationsService.sendBookingNotification({
        userId: customerId,
        type: "booking_completed" as any,
        bookingId,
        title: "Service Completed",
        body: `Your appointment with ${barberName} has been completed. Please rate your experience!`,
        data: { barberName },
      });

      // Send completion notification to barber
      await this.notificationsService.sendBookingNotification({
        userId: barberId,
        type: "booking_completed" as any,
        bookingId,
        title: "Service Completed",
        body: `Your appointment with ${customerName} has been completed. Great job!`,
        data: { customerName },
      });

      this.logger.log(
        `Booking completion notification sent for booking ${bookingId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send booking completion for ${bookingId}:`,
        error,
      );
      throw error;
    }
  }

  @Process("schedule-booking-reminders")
  async handleScheduleBookingReminders(job: any) {
    this.logger.log(`Processing schedule booking reminders job: ${job.id}`);

    try {
      // TODO: Implement logic to schedule reminders for upcoming bookings
      // - Find bookings scheduled for tomorrow
      // - Schedule reminder jobs for 24 hours before appointment
      // - Schedule reminder jobs for 1 hour before appointment

      this.logger.log("Booking reminders scheduled");
    } catch (error) {
      this.logger.error("Failed to schedule booking reminders:", error);
      throw error;
    }
  }
}
