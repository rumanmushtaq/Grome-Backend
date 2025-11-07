import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { OtpService } from './otp.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { LocalStrategy } from './strategies/local.strategy';
import { GoogleStrategy } from './strategies/google.strategy';
import { FacebookStrategy } from './strategies/facebook.strategy';
import { AppleStrategy } from './strategies/apple.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { LocalAuthGuard } from './guards/local-auth.guard';

// Schemas
import { User, UserSchema } from '../../schemas/user.schema';
import { Barber, BarberSchema } from '../../schemas/barber.schema';
import { RefreshToken, RefreshTokenSchema } from '../../schemas/refresh-token.schema';

// DTOs
import { AuthResponseDto } from '../../dto/auth/auth.dto';
import { ThreadEntity, ThreadSchema } from '@/schemas/thread.schema';

@Module({
  imports: [
    ConfigModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('jwt.secret'),
        signOptions: {
          expiresIn: configService.get<string>('jwt.expiresIn'),
        },
      }),
      inject: [ConfigService],
    }),
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Barber.name, schema: BarberSchema },
      { name: ThreadEntity.name, schema: ThreadSchema },
      { name: RefreshToken.name, schema: RefreshTokenSchema },
    ]),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    OtpService,
    JwtStrategy,
    LocalStrategy,
    GoogleStrategy,
    FacebookStrategy,
    AppleStrategy,
    JwtAuthGuard,
    LocalAuthGuard,
  ],
  exports: [AuthService, JwtAuthGuard, LocalAuthGuard],
})
export class AuthModule {}
