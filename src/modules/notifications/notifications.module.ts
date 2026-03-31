import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { BullModule } from "@nestjs/bull";

import { NotificationsController } from "./notifications.controller";
import { NotificationsService } from "./notifications.service";
import { FirebaseService } from "./firebase.service";
import {
  Notification,
  NotificationSchema,
} from "../../schemas/notification.schema";
import { User, UserSchema } from "../../schemas/user.schema";
import {
  ChatMessage,
  ChatMessageSchema,
} from "../../schemas/chat-message.schema";
import { Barber, BarberSchema } from "@/schemas/barber.schema";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Notification.name, schema: NotificationSchema },
      { name: User.name, schema: UserSchema },
      { name: ChatMessage.name, schema: ChatMessageSchema },
      { name: Barber.name, schema: BarberSchema },
    ]),
    BullModule.registerQueue({
      name: "notifications",
    }),
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService, FirebaseService],
  exports: [NotificationsService, FirebaseService],
})
export class NotificationsModule {}
