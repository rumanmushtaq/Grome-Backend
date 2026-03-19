import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { ScheduleModule } from "@nestjs/schedule";

import { PaymentsController } from "./payments.controller";
import { PaymentsService } from "./payments.service";
import { StripeService } from "./stripe.service";
import { PaymentCleanupService } from "./payment-cleanup.service";

// Schemas
import { Booking, BookingSchema } from "@/schemas/booking.schema";
import { User, UserSchema } from "@/schemas/user.schema";
import { Barber, BarberSchema } from "@/schemas/barber.schema";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Booking.name, schema: BookingSchema },
      { name: User.name, schema: UserSchema },
      { name: Barber.name, schema: BarberSchema },
    ]),
    ScheduleModule.forRoot(),
  ],
  controllers: [PaymentsController],
  providers: [PaymentsService, StripeService, PaymentCleanupService],
  exports: [PaymentsService, StripeService],
})
export class PaymentsModule {}
