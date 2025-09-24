import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { NotificationProcessor } from './notification.processor';
import { EmailProcessor } from './email.processor';
import { PaymentProcessor } from './payment.processor';
import { BookingProcessor } from './booking.processor';
import { JobsService } from './jobs.service';
import { JobsController } from './jobs.controller';
import { NotificationsModule } from '../modules/notifications/notifications.module';

@Module({
  imports: [
    BullModule.registerQueueAsync({
      name: 'notifications',
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        redis: {
          host: configService.get('redis.host'),
          port: configService.get('redis.port'),
          password: configService.get('redis.password'),
          db: configService.get('redis.db'),
        },
        defaultJobOptions: {
          removeOnComplete: 100,
          removeOnFail: 50,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
        },
      }),
      inject: [ConfigService],
    }),
    BullModule.registerQueueAsync({
      name: 'email',
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        redis: {
          host: configService.get('redis.host'),
          port: configService.get('redis.port'),
          password: configService.get('redis.password'),
          db: configService.get('redis.db'),
        },
        defaultJobOptions: {
          removeOnComplete: 50,
          removeOnFail: 25,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 5000,
          },
        },
      }),
      inject: [ConfigService],
    }),
    BullModule.registerQueueAsync({
      name: 'payments',
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        redis: {
          host: configService.get('redis.host'),
          port: configService.get('redis.port'),
          password: configService.get('redis.password'),
          db: configService.get('redis.db'),
        },
        defaultJobOptions: {
          removeOnComplete: 20,
          removeOnFail: 10,
          attempts: 5,
          backoff: {
            type: 'exponential',
            delay: 10000,
          },
        },
      }),
      inject: [ConfigService],
    }),
    BullModule.registerQueueAsync({
      name: 'bookings',
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        redis: {
          host: configService.get('redis.host'),
          port: configService.get('redis.port'),
          password: configService.get('redis.password'),
          db: configService.get('redis.db'),
        },
        defaultJobOptions: {
          removeOnComplete: 30,
          removeOnFail: 15,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 3000,
          },
        },
      }),
      inject: [ConfigService],
    }),
    NotificationsModule,
  ],
  controllers: [JobsController],
  providers: [
    NotificationProcessor,
    EmailProcessor,
    PaymentProcessor,
    BookingProcessor,
    JobsService,
  ],
  exports: [
    BullModule,
    JobsService,
  ],
})
export class JobsModule {}
