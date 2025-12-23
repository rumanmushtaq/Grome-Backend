import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { InjectQueue } from "@nestjs/bull";
import { Queue } from "bull";

import {
  Notification,
  NotificationDocument,
  NotificationType,
  NotificationChannel,
  NotificationStatus,
} from "../../schemas/notification.schema";

import { User, UserDocument } from "../../schemas/user.schema";
import { ChatMessageDocument } from "../../schemas/chat-message.schema";
import { Barber, BarberDocument } from "@/schemas/barber.schema";

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectModel(Notification.name)
    private readonly notificationModel: Model<NotificationDocument>,

    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,

    @InjectModel(Barber.name)
    private readonly barberModel: Model<BarberDocument>,

    @InjectQueue("notifications")
    private readonly notificationsQueue: Queue
  ) {}

  // ======================================================
  // CORE NOTIFICATION CREATOR (QUEUE-BASED)
  // ======================================================
  async createNotification(payload: {
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
    try {
      let user = await this.userModel.findById(payload.userId);
      if (!user) {
        user = await this.barberModel.findById(payload.userId);
        if (!user) {
          throw new NotFoundException("User not found");
        }
      }

      const notification = await this.notificationModel.create({
        ...payload,
        status: NotificationStatus.PENDING,
        isUrgent: this.isUrgentNotification(payload.type),
        retryCount: 0,
        maxRetries: 3,
      });

      await this.notificationsQueue.add("send-notification", {
        notificationId: notification._id.toString(),
      });

      return notification;
    } catch (error) {
      this.logger.error("Failed to create notification", error);

      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }

      throw new InternalServerErrorException("Failed to create notification");
    }
  }

  // ======================================================
  // CHAT MESSAGE NOTIFICATION
  // ======================================================
  async sendMessageNotification(message: ChatMessageDocument): Promise<void> {
    try {
      const recipient = await this.userModel.findById(message.toUserId);
      if (!recipient) return;

      const sender = await this.userModel.findById(message.fromUserId);
      const senderName = sender?.name || "Unknown User";

      // PUSH
      await this.createNotification({
        userId: message.toUserId.toString(),
        type: NotificationType.MESSAGE_RECEIVED,
        channel: NotificationChannel.PUSH,
        title: `New message from ${senderName}`,
        body: message.message || "Sent an attachment",
        conversationId: message.conversationId.toString(),
        fromUserId: message.fromUserId.toString(),
      });

      // EMAIL (if enabled)
      if (recipient.preferences?.notifications?.email) {
        await this.createNotification({
          userId: message.toUserId.toString(),
          type: NotificationType.MESSAGE_RECEIVED,
          channel: NotificationChannel.EMAIL,
          title: `New message from ${senderName}`,
          body: message.message || "Sent an attachment",
          conversationId: message.conversationId.toString(),
          fromUserId: message.fromUserId.toString(),
        });
      }
    } catch (error) {
      this.logger.error("Error sending message notification", error);
    }
  }

  // ======================================================
  // BOOKING NOTIFICATIONS
  // ======================================================
  async sendBookingNotification(payload: {
    userId: string;
    type: NotificationType;
    bookingId: string;
    title: string;
    body: string;
    data?: any;
  }): Promise<void> {
    const { userId, type, bookingId, title, body, data } = payload;

    await this.createNotification({
      userId,
      type,
      channel: NotificationChannel.PUSH,
      title,
      body,
      data,
      bookingId,
    });

    await this.createNotification({
      userId,
      type,
      channel: NotificationChannel.EMAIL,
      title,
      body,
      data,
      bookingId,
    });
  }

  // ======================================================
  // PAYMENT NOTIFICATIONS
  // ======================================================
  async sendPaymentNotification(payload: {
    userId: string;
    type: NotificationType;
    bookingId: string;
    amount: number;
    status: string;
  }): Promise<void> {
    const { userId, type, bookingId, amount, status } = payload;

    const title =
      status === "completed" ? "Payment Successful" : "Payment Failed";

    const body =
      status === "completed"
        ? `Your payment of $${amount} was successful`
        : `Your payment of $${amount} failed. Please try again`;

    await this.createNotification({
      userId,
      type,
      channel: NotificationChannel.PUSH,
      title,
      body,
      bookingId,
      data: { amount, status },
    });

    await this.createNotification({
      userId,
      type,
      channel: NotificationChannel.EMAIL,
      title,
      body,
      bookingId,
      data: { amount, status },
    });
  }

  // ======================================================
  // SYSTEM BROADCAST
  // ======================================================
  async sendSystemNotification(payload: {
    userIds: string[];
    type: NotificationType;
    title: string;
    body: string;
    data?: any;
  }): Promise<void> {
    const notifications = payload.userIds.map((userId) => ({
      userId,
      type: payload.type,
      channel: NotificationChannel.PUSH,
      title: payload.title,
      body: payload.body,
      data: payload.data,
      status: NotificationStatus.PENDING,
      isUrgent: this.isUrgentNotification(payload.type),
      retryCount: 0,
      maxRetries: 3,
    }));

    const saved = await this.notificationModel.insertMany(notifications);

    for (const n of saved) {
      await this.notificationsQueue.add("send-notification", {
        notificationId: n._id.toString(),
      });
    }
  }

  // ======================================================
  // FETCH / READ / DELETE
  // ======================================================
  async getUserNotifications(
    userId: string,
    page = 1,
    limit = 20,
    unreadOnly = false
  ) {
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
        .lean(), // 🔥 important

      this.notificationModel.countDocuments(filter),
    ]);

    return {
      message: "Notifications fetched successfully",
      data: {
        notifications,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        unreadOnly,
      },
    };
  }

  async markAsRead(notificationId: string, userId: string): Promise<void> {
    const result = await this.notificationModel.updateOne(
      { _id: notificationId, userId },
      { status: NotificationStatus.READ, readAt: new Date() }
    );

    if (!result.matchedCount) {
      throw new NotFoundException("Notification not found");
    }
  }

  async markAllAsRead(userId: string): Promise<void> {
    await this.notificationModel.updateMany(
      {
        userId,
        status: {
          $in: [NotificationStatus.PENDING, NotificationStatus.SENT],
        },
      },
      { status: NotificationStatus.READ, readAt: new Date() }
    );
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.notificationModel.countDocuments({
      userId,
      status: {
        $in: [NotificationStatus.PENDING, NotificationStatus.SENT],
      },
    });
  }

  async deleteNotification(
    notificationId: string,
    userId: string
  ): Promise<void> {
    const result = await this.notificationModel.deleteOne({
      _id: notificationId,
      userId,
    });

    if (!result.deletedCount) {
      throw new NotFoundException("Notification not found");
    }
  }

  async deleteAllNotifications(userId: string): Promise<void> {
    await this.notificationModel.deleteMany({ userId });
  }

  // ======================================================
  // QUEUE PROCESSOR HANDLER
  // ======================================================
  async processNotification(job: any): Promise<void> {
    const { notificationId } = job.data;

    try {
      const notification =
        await this.notificationModel.findById(notificationId);

      if (!notification) return;

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

      notification.status = NotificationStatus.SENT;
      notification.sentAt = new Date();
      await notification.save();
    } catch (error) {
      await this.handleNotificationFailure(notificationId, error);
    }
  }

  // ======================================================
  // FAILURE & RETRY
  // ======================================================
  private async handleNotificationFailure(notificationId: string, error: any) {
    const notification = await this.notificationModel.findById(notificationId);

    if (!notification) return;

    notification.retryCount += 1;
    notification.failedAt = new Date();
    notification.failureReason = error.message;

    if (notification.retryCount >= notification.maxRetries) {
      notification.status = NotificationStatus.FAILED;
      await notification.save();
      return;
    }

    await notification.save();

    const delay = Math.pow(2, notification.retryCount) * 1000;
    await this.notificationsQueue.add(
      "send-notification",
      { notificationId },
      { delay }
    );
  }

  // ======================================================
  // CHANNEL IMPLEMENTATIONS (STUBS)
  // ======================================================
  private async sendPushNotification(notification: NotificationDocument) {
    this.logger.log(`PUSH → ${notification.userId}: ${notification.title}`);
  }

  private async sendEmailNotification(notification: NotificationDocument) {
    this.logger.log(`EMAIL → ${notification.userId}: ${notification.title}`);
  }

  private async sendSmsNotification(notification: NotificationDocument) {
    this.logger.log(`SMS → ${notification.userId}: ${notification.title}`);
  }

  private async sendInAppNotification(notification: NotificationDocument) {
    this.logger.log(`IN-APP → ${notification.userId}: ${notification.title}`);
  }

  private isUrgentNotification(type: NotificationType): boolean {
    return [
      NotificationType.BOOKING_CANCELLED,
      NotificationType.PAYMENT_FAILED,
      NotificationType.SYSTEM_UPDATE,
    ].includes(type);
  }
}
