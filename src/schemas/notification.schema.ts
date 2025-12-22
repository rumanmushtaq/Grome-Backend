import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type NotificationDocument = Notification & Document;

export enum NotificationType {
  //////Bookings
  BOOKING_CREATED = "booking_created",
  BOOKING_ACCEPTED = "booking_accepted",
  BOOKING_CANCELLED = "booking_cancelled",
  BOOKING_COMPLETED = "booking_completed",
  BOOKING_REMINDER = "booking_reminder",

  /////Payment
  PAYMENT_SUCCESS = "payment_success",
  PAYMENT_FAILED = "payment_failed",

  ////Message
  MESSAGE_RECEIVED = "message_received",
  REVIEW_REQUEST = "review_request",
  PROMO_CODE = "promo_code",
  SYSTEM_UPDATE = "system_update",
  BARBER_VERIFICATION = "barber_verification",
  WALLET_TRANSACTION = "wallet_transaction",
}

export enum NotificationChannel {
  PUSH = "push",
  EMAIL = "email",
  SMS = "sms",
  IN_APP = "in_app",
}

export enum NotificationStatus {
  PENDING = "pending",
  SENT = "sent",
  DELIVERED = "delivered",
  READ = "read",
  FAILED = "failed",
}

export enum NotificationRecipientRole {
  CUSTOMER = "customer",
  BARBER = "barber",
  ADMIN = "admin",
}

@Schema({ timestamps: true })
export class Notification {
  @Prop({ type: Types.ObjectId, ref: "User", required: true, index: true })
  userId: Types.ObjectId;

  @Prop({
    type: String,
    enum: Object.values(NotificationType),
    required: true,
    index: true,
  })
  type: NotificationType;

  @Prop({
    type: String,
    enum: Object.values(NotificationChannel),
    required: true,
    index: true,
  })
  channel: NotificationChannel;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  body: string;

  @Prop({ type: Object })
  data?: Record<string, any>; // Additional data payload

  @Prop({
    type: String,
    enum: Object.values(NotificationStatus),
    default: NotificationStatus.PENDING,
    index: true,
  })
  status: NotificationStatus;

  @Prop()
  sentAt?: Date;

  @Prop()
  deliveredAt?: Date;

  @Prop({ default: false, index: true })
  isRead: boolean;

  @Prop()
  readAt?: Date;

  @Prop()
  failedAt?: Date;

  @Prop()
  failureReason?: string;

  // Related entities
  @Prop({ type: Types.ObjectId, ref: "Booking" })
  bookingId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "Conversation" })
  conversationId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "User" })
  fromUserId?: Types.ObjectId;

  // Notification settings
  @Prop({ default: true })
  isUrgent: boolean;

  @Prop()
  scheduledFor?: Date;

  @Prop({ default: 0 })
  retryCount: number;

  @Prop()
  maxRetries: number;

  // Push notification specific
  @Prop()
  deviceToken?: string;

  @Prop()
  platform?: string; // 'ios', 'android', 'web'

  @Prop()
  badgeCount?: number;

  @Prop()
  sound?: string;

  @Prop()
  clickAction?: string;

  // Email specific
  @Prop()
  emailTemplate?: string;

  @Prop()
  emailSubject?: string;

  @Prop()
  emailHtml?: string;

  @Prop()
  emailText?: string;

  // SMS specific
  @Prop()
  phoneNumber?: string;

  @Prop()
  smsProvider?: string;

  @Prop()
  smsMessageId?: string;

  // Grouping and threading
  @Prop()
  groupKey?: string;

  @Prop()
  threadId?: string;

  // Expiration
  @Prop()
  expiresAt?: Date;

  // Analytics
  @Prop()
  campaignId?: string;

  @Prop()
  source?: string; // 'system', 'user_action', 'scheduled', 'webhook'

  @Prop({ type: Object })
  metadata?: Record<string, any>; // Additional metadata for analytics

  @Prop({
    type: String,
    enum: Object.values(NotificationRecipientRole),
    index: true,
  })
  recipientRole: NotificationRecipientRole;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);

// Indexes
NotificationSchema.index({ userId: 1, status: 1, createdAt: -1 });
NotificationSchema.index({ type: 1, channel: 1 });
NotificationSchema.index({ scheduledFor: 1 }, { expireAfterSeconds: 0 });
NotificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
NotificationSchema.index({ bookingId: 1 });
NotificationSchema.index({ conversationId: 1 });
NotificationSchema.index({ groupKey: 1 });
NotificationSchema.index({ threadId: 1 });
NotificationSchema.index({ campaignId: 1 });
