import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';

@Injectable()
export class JobsService {
  private readonly logger = new Logger(JobsService.name);

  constructor(
    @InjectQueue('notifications') private notificationsQueue: Queue,
    @InjectQueue('email') private emailQueue: Queue,
    @InjectQueue('payments') private paymentsQueue: Queue,
    @InjectQueue('bookings') private bookingsQueue: Queue,
  ) {}

  // Notification Jobs
  async sendNotification(data: {
    userId: string;
    type: string;
    channel: string;
    title: string;
    body: string;
    data?: any;
    bookingId?: string;
    conversationId?: string;
    fromUserId?: string;
  }) {
    return this.notificationsQueue.add('send-notification', data, {
      priority: data.type === 'urgent' ? 10 : 1,
    });
  }

  async sendBulkNotifications(notifications: any[]) {
    return this.notificationsQueue.add('send-bulk-notifications', { notifications });
  }

  // Email Jobs
  async sendWelcomeEmail(userEmail: string, userName: string) {
    return this.emailQueue.add('send-welcome-email', {
      userEmail,
      userName,
    }, {
      delay: 5000, // Send after 5 seconds
    });
  }

  async sendBookingConfirmation(data: {
    userEmail: string;
    userName: string;
    barberName: string;
    scheduledAt: Date;
    services: any[];
  }) {
    return this.emailQueue.add('send-booking-confirmation', data);
  }

  async sendBookingReminderEmail(data: {
    userEmail: string;
    userName: string;
    barberName: string;
    scheduledAt: Date;
  }) {
    return this.emailQueue.add('send-booking-reminder', data, {
      delay: 24 * 60 * 60 * 1000, // Send 24 hours before
    });
  }

  async sendPasswordReset(userEmail: string, userName: string, resetToken: string) {
    return this.emailQueue.add('send-password-reset', {
      userEmail,
      userName,
      resetToken,
    });
  }

  // Payment Jobs
  async processPayment(data: {
    bookingId: string;
    amount: number;
    currency: string;
    paymentMethodId: string;
    customerId: string;
  }) {
    return this.paymentsQueue.add('process-payment', data, {
      priority: 10, // High priority for payments
      attempts: 5,
    });
  }

  async processRefund(data: {
    paymentIntentId: string;
    amount: number;
    reason?: string;
    bookingId: string;
    customerId: string;
  }) {
    return this.paymentsQueue.add('process-refund', data, {
      priority: 8,
      attempts: 3,
    });
  }

  async processPayout(data: {
    barberId: string;
    amount: number;
    bankAccountId: string;
    bookingId: string;
  }) {
    return this.paymentsQueue.add('process-payout', data, {
      delay: 24 * 60 * 60 * 1000, // Process payout after 24 hours
    });
  }

  async handleWebhook(event: any) {
    return this.paymentsQueue.add('handle-webhook', { event }, {
      priority: 5,
    });
  }

  // Booking Jobs
  async sendBookingConfirmationNotification(data: {
    bookingId: string;
    customerId: string;
    barberId: string;
    scheduledAt: Date;
    services: any[];
    customerName: string;
    barberName: string;
  }) {
    return this.bookingsQueue.add('send-booking-confirmation', data);
  }

  async sendBookingReminder(data: {
    bookingId: string;
    customerId: string;
    barberId: string;
    scheduledAt: Date;
    customerName: string;
    barberName: string;
  }) {
    return this.bookingsQueue.add('send-booking-reminder', data, {
      delay: 24 * 60 * 60 * 1000, // Send 24 hours before
    });
  }

  async sendBookingCancellation(data: {
    bookingId: string;
    customerId: string;
    barberId: string;
    reason?: string;
    cancelledBy: string;
    customerName: string;
    barberName: string;
  }) {
    return this.bookingsQueue.add('send-booking-cancellation', data);
  }

  async sendBookingCompletion(data: {
    bookingId: string;
    customerId: string;
    barberId: string;
    customerName: string;
    barberName: string;
  }) {
    return this.bookingsQueue.add('send-booking-completion', data);
  }

  async cleanupExpiredBookings() {
    return this.bookingsQueue.add('cleanup-expired-bookings', {}, {
      repeat: { cron: '0 0 * * *' }, // Run daily at midnight
    });
  }

  async scheduleBookingReminders() {
    return this.bookingsQueue.add('schedule-booking-reminders', {}, {
      repeat: { cron: '0 6 * * *' }, // Run daily at 6 AM
    });
  }

  // Queue Management
  async getQueueStats() {
    const [notifications, email, payments, bookings] = await Promise.all([
      this.getQueueStatsForQueue(this.notificationsQueue),
      this.getQueueStatsForQueue(this.emailQueue),
      this.getQueueStatsForQueue(this.paymentsQueue),
      this.getQueueStatsForQueue(this.bookingsQueue),
    ]);

    return {
      notifications,
      email,
      payments,
      bookings,
      total: {
        waiting: notifications.waiting + email.waiting + payments.waiting + bookings.waiting,
        active: notifications.active + email.active + payments.active + bookings.active,
        completed: notifications.completed + email.completed + payments.completed + bookings.completed,
        failed: notifications.failed + email.failed + payments.failed + bookings.failed,
      },
    };
  }

  private async getQueueStatsForQueue(queue: Queue) {
    const [waiting, active, completed, failed] = await Promise.all([
      queue.getWaiting(),
      queue.getActive(),
      queue.getCompleted(),
      queue.getFailed(),
    ]);

    return {
      waiting: waiting.length,
      active: active.length,
      completed: completed.length,
      failed: failed.length,
    };
  }

  async pauseQueue(queueName: string) {
    const queue = this.getQueueByName(queueName);
    if (queue) {
      await queue.pause();
      this.logger.log(`Queue ${queueName} paused`);
    }
  }

  async resumeQueue(queueName: string) {
    const queue = this.getQueueByName(queueName);
    if (queue) {
      await queue.resume();
      this.logger.log(`Queue ${queueName} resumed`);
    }
  }

  async clearQueue(queueName: string) {
    const queue = this.getQueueByName(queueName);
    if (queue) {
      await queue.empty();
      this.logger.log(`Queue ${queueName} cleared`);
    }
  }

  async retryFailedJobs(queueName: string) {
    const queue = this.getQueueByName(queueName);
    if (queue) {
      const failedJobs = await queue.getFailed();
      for (const job of failedJobs) {
        await job.retry();
      }
      this.logger.log(`Retried ${failedJobs.length} failed jobs in queue ${queueName}`);
    }
  }

  private getQueueByName(queueName: string): Queue | null {
    switch (queueName) {
      case 'notifications':
        return this.notificationsQueue;
      case 'email':
        return this.emailQueue;
      case 'payments':
        return this.paymentsQueue;
      case 'bookings':
        return this.bookingsQueue;
      default:
        return null;
    }
  }

  // Health Check
  async healthCheck() {
    try {
      const stats = await this.getQueueStats();
      return {
        status: 'healthy',
        queues: stats,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Health check failed:', error);
      return {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }
}
