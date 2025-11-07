import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ThrottlerModule } from '@nestjs/throttler';
import { BullModule } from '@nestjs/bull';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

// Core modules
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { BarbersModule } from './modules/barbers/barbers.module';
import { ServicesModule } from './modules/services/services.module';
import { BookingsModule } from './modules/bookings/bookings.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { ChatModule } from './modules/chat/chat.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { WalletModule } from './modules/wallet/wallet.module';
import { AdminModule } from './modules/admin/admin.module';
import { MediaModule } from './modules/media/media.module';
import { SearchModule } from './modules/search/search.module';
import { PromoCodesModule } from './modules/promo-codes/promo-codes.module';
import { ReportsModule } from './modules/reports/reports.module';
import { S3StorageModule } from './modules/s3Storage/s3Storage.module';
import { ThreadModule } from './modules/thread/thread.module';

// Shared modules
import { DatabaseModule } from './config/database.module';
import { RedisModule } from './config/redis.module';
import { LoggerModule } from './common/logger/logger.module';
import { JobsModule } from './jobs/jobs.module';

// Configuration
import configuration from './config/configuration';
import { validationSchema } from './config/validation.schema';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validationSchema,
    }),

    // Database
    DatabaseModule,
    RedisModule,

    // Rate limiting
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        throttlers: [{
          ttl: configService.get('RATE_LIMIT_TTL', 60) * 1000,
          limit: configService.get('RATE_LIMIT_LIMIT', 100),
        }],
      }),
      inject: [ConfigService],
    }),

    // Bull Queue
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        redis: {
          host: configService.get('REDIS_HOST', 'localhost'),
          port: configService.get('REDIS_PORT', 6379),
          password: configService.get('REDIS_PASSWORD'),
          db: configService.get('REDIS_DB', 0),
        },
      }),
      inject: [ConfigService],
    }),

    // JWT
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get('JWT_EXPIRES_IN', '15m'),
        },
      }),
      inject: [ConfigService],
    }),

    // Passport
    PassportModule.register({ defaultStrategy: 'jwt' }),

    // Logger
    LoggerModule,

    // Jobs
    JobsModule,

    // Feature modules
    AuthModule,
    UsersModule,
    S3StorageModule,
    BarbersModule,
    ServicesModule,
    BookingsModule,
    PaymentsModule,
    ChatModule,
    NotificationsModule,
    WalletModule,
    AdminModule,
    MediaModule,
    SearchModule,
    PromoCodesModule,
    ReportsModule,
    ThreadModule
  ],
})
export class AppModule {}
