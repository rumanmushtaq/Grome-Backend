import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';
import { Booking, BookingSchema } from '../../schemas/booking.schema';
import { User, UserSchema } from '../../schemas/user.schema';
import { Barber, BarberSchema } from '../../schemas/barber.schema';
import { NotificationsService } from '../notifications/notifications.service';
import { Notification, NotificationSchema } from '@/schemas/notification.schema';
import { BullModule } from '@nestjs/bull';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Booking.name, schema: BookingSchema },
      { name: User.name, schema: UserSchema },
      { name: Barber.name, schema: BarberSchema },
      { name: Notification.name, schema: NotificationSchema },
      
    ]),
    BullModule.registerQueue({
          name: 'notifications',
        }),
  ],
  controllers: [BookingsController],
  providers: [BookingsService, NotificationsService],
  exports: [BookingsService],
})
export class BookingsModule {}
