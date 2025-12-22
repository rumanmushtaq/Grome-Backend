import { NotificationChannel, NotificationRecipientRole, NotificationType } from "@/schemas/notification.schema";

export class SendNotificationDto {
  userId?: string; // optional for broadcast
  role?: NotificationRecipientRole;
  title: string;
  body: string;
  channel: NotificationChannel;
  type: NotificationType;
  data?: Record<string, any>;
}