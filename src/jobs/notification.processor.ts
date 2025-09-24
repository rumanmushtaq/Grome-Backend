import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';

import { NotificationsService } from '../modules/notifications/notifications.service';

@Processor('notifications')
export class NotificationProcessor {
  private readonly logger = new Logger(NotificationProcessor.name);

  constructor(private readonly notificationsService: NotificationsService) {}

  @Process('send-notification')
  async handleSendNotification(job: any) {
    this.logger.log(`Processing notification job: ${job.id}`);
    
    try {
      await this.notificationsService.processNotification(job);
      this.logger.log(`Notification job ${job.id} completed successfully`);
    } catch (error) {
      this.logger.error(`Notification job ${job.id} failed:`, error);
      throw error;
    }
  }

  @Process('send-bulk-notifications')
  async handleSendBulkNotifications(job: any) {
    this.logger.log(`Processing bulk notification job: ${job.id}`);
    
    const { notifications } = job.data;
    
    try {
      for (const notification of notifications) {
        await this.notificationsService.processNotification({
          data: { notificationId: notification._id.toString() },
        });
      }
      
      this.logger.log(`Bulk notification job ${job.id} completed successfully`);
    } catch (error) {
      this.logger.error(`Bulk notification job ${job.id} failed:`, error);
      throw error;
    }
  }
}
