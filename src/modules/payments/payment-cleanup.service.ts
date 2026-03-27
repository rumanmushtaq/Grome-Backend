import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { PaymentsService } from "./payments.service";

@Injectable()
export class PaymentCleanupService {
  private readonly logger = new Logger(PaymentCleanupService.name);

  constructor(private paymentsService: PaymentsService) {}

  /**
   * Run every minute to clean up expired pending bookings
   */
  @Cron(CronExpression.EVERY_10_MINUTES)
  async handleExpiredBookings() {
    this.logger.debug("Running expired bookings cleanup...");

    try {
      const result = await this.paymentsService.deleteExpiredPendingBookings();

      if (result.deletedCount > 0) {
        this.logger.log(
          `Cleaned up ${result.deletedCount} expired pending bookings: ${result.bookings.join(", ")}`
        );
      }
    } catch (error) {
      this.logger.error("Failed to clean up expired bookings", error);
    }
  }
}
