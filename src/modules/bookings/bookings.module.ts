import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";

import { BookingsController } from "./bookings.controller";
import { BookingsService } from "./bookings.service";
import { Booking, BookingSchema } from "../../schemas/booking.schema";
import { User, UserSchema } from "../../schemas/user.schema";
import { Barber, BarberSchema } from "../../schemas/barber.schema";
import {
  Notification,
  NotificationSchema,
} from "@/schemas/notification.schema";
import { PaymentsModule } from "../payments/payments.module";
import { JobsModule } from "../../jobs/jobs.module";
import { NotificationsModule } from "../notifications/notifications.module";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Booking.name, schema: BookingSchema },
      { name: User.name, schema: UserSchema },
      { name: Barber.name, schema: BarberSchema },
      { name: Notification.name, schema: NotificationSchema },
    ]),
    PaymentsModule,
    JobsModule,
    NotificationsModule,
  ],
  controllers: [BookingsController],
  providers: [BookingsService],
  exports: [BookingsService],
})
export class BookingsModule {}
