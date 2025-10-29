import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { InjectQueue } from "@nestjs/bull";
import { Queue } from "bull";
import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
} from "@nestjs/common";
import {
  Notification,
  NotificationDocument,
  NotificationType,
  NotificationChannel,
  NotificationStatus,
} from "../../schemas/notification.schema";
import {
  ChatMessage,
  ChatMessageDocument,
} from "../../schemas/chat-message.schema";
import { User, UserDocument } from "../../schemas/user.schema";

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectModel(Notification.name)
    private notificationModel: Model<NotificationDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectQueue("notifications") private notificationsQueue: Queue
  ) {}

  async createNotification(data: {
    userId: string;
    type: NotificationType;
    channel: NotificationChannel;
    title: string;
    body: string;
    data?: any;
    bookingId?: string;
    conversationId?: string;
    fromUserId?: string;
  }): Promise<NotificationDocument> {
    const notification = new this.notificationModel({
      ...data,
      status: NotificationStatus.PENDING,
      isUrgent: this.isUrgentNotification(data.type),
      retryCount: 0,
      maxRetries: 3,
    });

    await notification.save();

    // Add to queue for processing
    await this.notificationsQueue.add("send-notification", {
      notificationId: notification._id.toString(),
    });

    return notification;
  }

  async sendMessageNotification(message: ChatMessageDocument): Promise<void> {
    try {
      // Get recipient user
      const recipient = await this.userModel.findById(message.toUserId);
      if (!recipient) return;

      // Get sender user
      const sender = await this.userModel.findById(message.fromUserId);
      const senderName = sender?.name || "Unknown User";

      // Check if recipient is online (you might want to check this via Socket.IO)
      // For now, we'll send push notification
      await this.createNotification({
        userId: message.toUserId.toString(),
        type: NotificationType.MESSAGE_RECEIVED,
        channel: NotificationChannel.PUSH,
        title: `New message from ${senderName}`,
        body: message.message || "Sent an attachment",
        data: {
          conversationId: message.conversationId.toString(),
          messageId: message._id.toString(),
          fromUserId: message.fromUserId.toString(),
        },
        conversationId: message.conversationId.toString(),
        fromUserId: message.fromUserId.toString(),
      });

      // Send email notification if user prefers
      if (recipient.preferences?.notifications?.email) {
        await this.createNotification({
          userId: message.toUserId.toString(),
          type: NotificationType.MESSAGE_RECEIVED,
          channel: NotificationChannel.EMAIL,
          title: `New message from ${senderName}`,
          body: message.message || "Sent an attachment",
          data: {
            conversationId: message.conversationId.toString(),
            messageId: message._id.toString(),
            fromUserId: message.fromUserId.toString(),
          },
          conversationId: message.conversationId.toString(),
          fromUserId: message.fromUserId.toString(),
        });
      }
    } catch (error) {
      this.logger.error("Error sending message notification:", error);
    }
  }

  async sendBookingNotification(data: {
    userId: string;
    type: NotificationType;
    bookingId: string;
    title: string;
    body: string;
    data?: any;
  }): Promise<void> {
    const { userId, type, bookingId, title, body, data: additionalData } = data;

    // Send push notification
    await this.createNotification({
      userId,
      type,
      channel: NotificationChannel.PUSH,
      title,
      body,
      data: additionalData,
      bookingId,
    });

    // Send email notification
    await this.createNotification({
      userId,
      type,
      channel: NotificationChannel.EMAIL,
      title,
      body,
      data: additionalData,
      bookingId,
    });
  }

  async sendPaymentNotification(data: {
    userId: string;
    type: NotificationType;
    bookingId: string;
    amount: number;
    status: string;
  }): Promise<void> {
    const { userId, type, bookingId, amount, status } = data;

    const title =
      status === "completed" ? "Payment Successful" : "Payment Failed";
    const body =
      status === "completed"
        ? `Your payment of $${amount} has been processed successfully`
        : `Your payment of $${amount} failed. Please try again.`;

    await this.createNotification({
      userId,
      type,
      channel: NotificationChannel.PUSH,
      title,
      body,
      data: { bookingId, amount, status },
      bookingId,
    });

    // Send email for payment notifications
    await this.createNotification({
      userId,
      type,
      channel: NotificationChannel.EMAIL,
      title,
      body,
      data: { bookingId, amount, status },
      bookingId,
    });
  }

  async sendSystemNotification(data: {
    userIds: string[];
    type: NotificationType;
    title: string;
    body: string;
    data?: any;
  }): Promise<void> {
    const { userIds, type, title, body, data: additionalData } = data;

    // Create notifications for all users
    const notifications = userIds.map((userId) => ({
      userId,
      type,
      channel: NotificationChannel.PUSH,
      title,
      body,
      data: additionalData,
      status: NotificationStatus.PENDING,
      isUrgent: this.isUrgentNotification(type),
      retryCount: 0,
      maxRetries: 3,
    }));

    const savedNotifications =
      await this.notificationModel.insertMany(notifications);

    // Add to queue for processing
    for (const notification of savedNotifications) {
      await this.notificationsQueue.add("send-notification", {
        notificationId: notification._id.toString(),
      });
    }
  }

  async getUserNotifications(
    userId: string,
    page: number = 1,
    limit: number = 20,
    unreadOnly: boolean = false
  ): Promise<{
    message: string;
    data: {
      notifications: NotificationDocument[];
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  }> {
    try {
      const skip = (page - 1) * limit;
      const filter: any = { userId };

      if (unreadOnly) {
        filter.status = {
          $in: [NotificationStatus.PENDING, NotificationStatus.SENT],
        };
      }

      const [notifications, total] = await Promise.all([
        this.notificationModel
          .find(filter)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .exec(),
        this.notificationModel.countDocuments(filter),
      ]);

      return {
        message: "Getting all notifications successfully",
        data: {
          notifications,
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      // ✅ Handle expected NestJS exceptions
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }

      // ✅ Catch all unexpected errors
      throw new InternalServerErrorException({
        message: error.message || "Failed to add service to barber profile",
        statusCode: 500,
        error: true,
      });
    }
  }

  async markAsRead(notificationId: string, userId: string): Promise<void> {
    await this.notificationModel.updateOne(
      { _id: notificationId, userId },
      {
        status: NotificationStatus.READ,
        readAt: new Date(),
      }
    );
  }

  async markAllAsRead(userId: string): Promise<void> {
    await this.notificationModel.updateMany(
      {
        userId,
        status: { $in: [NotificationStatus.PENDING, NotificationStatus.SENT] },
      },
      {
        status: NotificationStatus.READ,
        readAt: new Date(),
      }
    );
  }

  async getUnreadCount(userId: string): Promise<number> {
    try{


      return this.notificationModel.countDocuments({
        userId,
        status: { $in: [NotificationStatus.PENDING, NotificationStatus.SENT] },
      });
    }catch (error) {
      // ✅ Handle expected NestJS exceptions
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }

      // ✅ Catch all unexpected errors
      throw new InternalServerErrorException({
        message: error.message || "Failed to add service to barber profile",
        statusCode: 500,
        error: true,
      });
    }
  }

  async deleteNotification(
    notificationId: string,
    userId: string
  ): Promise<void> {
    await this.notificationModel.deleteOne({
      _id: notificationId,
      userId,
    });
  }

  async deleteAllNotifications(userId: string): Promise<void> {
    await this.notificationModel.deleteMany({ userId });
  }

  private isUrgentNotification(type: NotificationType): boolean {
    const urgentTypes = [
      NotificationType.BOOKING_CANCELLED,
      NotificationType.PAYMENT_FAILED,
      NotificationType.SYSTEM_UPDATE,
    ];
    return urgentTypes.includes(type);
  }

  // Queue job processors
  async processNotification(job: any): Promise<void> {
    const { notificationId } = job.data;

    try {
      const notification =
        await this.notificationModel.findById(notificationId);
      if (!notification) {
        this.logger.warn(`Notification ${notificationId} not found`);
        return;
      }

      // Process based on channel
      switch (notification.channel) {
        case NotificationChannel.PUSH:
          await this.sendPushNotification(notification);
          break;
        case NotificationChannel.EMAIL:
          await this.sendEmailNotification(notification);
          break;
        case NotificationChannel.SMS:
          await this.sendSmsNotification(notification);
          break;
        case NotificationChannel.IN_APP:
          await this.sendInAppNotification(notification);
          break;
      }

      // Update status
      notification.status = NotificationStatus.SENT;
      notification.sentAt = new Date();
      await notification.save();
    } catch (error) {
      this.logger.error(
        `Error processing notification ${notificationId}:`,
        error
      );

      // Update retry count
      await this.notificationModel.findByIdAndUpdate(notificationId, {
        $inc: { retryCount: 1 },
        failedAt: new Date(),
        failureReason: error.message,
      });

      // Check if max retries reached
      const notification =
        await this.notificationModel.findById(notificationId);
      if (notification.retryCount >= notification.maxRetries) {
        notification.status = NotificationStatus.FAILED;
        await notification.save();
      } else {
        // Retry with exponential backoff
        const delay = Math.pow(2, notification.retryCount) * 1000;
        await this.notificationsQueue.add(
          "send-notification",
          { notificationId },
          { delay }
        );
      }
    }
  }

  private async sendPushNotification(
    notification: NotificationDocument
  ): Promise<void> {
    // TODO: Implement Firebase FCM push notification
    this.logger.log(
      `Sending push notification to user ${notification.userId}: ${notification.title}`
    );
  }

  private async sendEmailNotification(
    notification: NotificationDocument
  ): Promise<void> {
    // TODO: Implement email sending via SMTP/SES
    this.logger.log(
      `Sending email notification to user ${notification.userId}: ${notification.title}`
    );
  }

  private async sendSmsNotification(
    notification: NotificationDocument
  ): Promise<void> {
    // TODO: Implement SMS sending via Twilio
    this.logger.log(
      `Sending SMS notification to user ${notification.userId}: ${notification.title}`
    );
  }

  private async sendInAppNotification(
    notification: NotificationDocument
  ): Promise<void> {
    // TODO: Implement in-app notification (Socket.IO)
    this.logger.log(
      `Sending in-app notification to user ${notification.userId}: ${notification.title}`
    );
  }
}
