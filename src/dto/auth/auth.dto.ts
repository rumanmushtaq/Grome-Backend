import { IsEmail, IsString, IsOptional, IsPhoneNumber, MinLength, IsEnum, IsBoolean, IsNumber, IsArray, ValidateNested, Min, IsMongoId } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '../../schemas/user.schema';

export class SignUpDto {
  @ApiProperty({ description: 'User email address' })
  @IsEmail()
  email: string;

  @ApiProperty({ description: 'User phone number' })
  @IsPhoneNumber()
  phone: string;

  @ApiProperty({ description: 'User password', minLength: 8 })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({ description: 'User full name' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Device ID for refresh token tracking' })
  @IsOptional()
  @IsString()
  deviceId?: string;

  @ApiPropertyOptional({ description: 'Device name' })
  @IsOptional()
  @IsString()
  deviceName?: string;

  @ApiPropertyOptional({ description: 'Device type' })
  @IsOptional()
  @IsString()
  deviceType?: string;
}

export class SignInDto {
  @ApiProperty({ description: 'User email or phone number' })
  @IsString()
  identifier: string;

  @ApiProperty({ description: 'User password' })
  @IsString()
  password: string;

  @ApiPropertyOptional({ description: 'Device ID for refresh token tracking' })
  @IsOptional()
  @IsString()
  deviceId?: string;

  @ApiPropertyOptional({ description: 'Device name' })
  @IsOptional()
  @IsString()
  deviceName?: string;

  @ApiPropertyOptional({ description: 'Device type' })
  @IsOptional()
  @IsString()
  deviceType?: string;
}

export class RefreshTokenDto {
  @ApiProperty({ description: 'Refresh token' })
  @IsString()
  refreshToken: string;

  @ApiPropertyOptional({ description: 'Device ID' })
  @IsOptional()
  @IsString()
  deviceId?: string;
}

export class ForgotPasswordDto {
  @ApiProperty({ description: 'User email address' })
  @IsEmail()
  email: string;
}

export class ResetPasswordDto {
  @ApiProperty({ description: 'Reset token' })
  @IsString()
  token: string;

  @ApiProperty({ description: 'New password', minLength: 8 })
  @IsString()
  @MinLength(8)
  newPassword: string;
}

export class VerifyEmailDto {
  @ApiProperty({ description: 'Email verification token' })
  @IsString()
  token: string;
}

export class VerifyPhoneDto {
  @ApiProperty({ description: 'Phone verification code' })
  @IsString()
  code: string;

  @ApiProperty({ description: 'Phone number to verify' })
  @IsPhoneNumber()
  phone: string;
}

export class ResendPhoneVerificationDto {
  @ApiProperty({ description: 'Phone number to resend verification code' })
  @IsPhoneNumber()
  phone: string;
}

export class ChangePasswordDto {
  @ApiProperty({ description: 'Current password' })
  @IsString()
  currentPassword: string;

  @ApiProperty({ description: 'New password', minLength: 8 })
  @IsString()
  @MinLength(8)
  newPassword: string;
}

export class SocialSignInDto {
  @ApiProperty({ description: 'Social provider', enum: ['google', 'facebook', 'apple'] })
  @IsString()
  provider: 'google' | 'facebook' | 'apple';

  @ApiProperty({ description: 'ID token from social provider' })
  @IsString()
  idToken: string;

  @ApiPropertyOptional({ description: 'Device ID for refresh token tracking' })
  @IsOptional()
  @IsString()
  deviceId?: string;

  @ApiPropertyOptional({ description: 'Device name' })
  @IsOptional()
  @IsString()
  deviceName?: string;

  @ApiPropertyOptional({ description: 'Device type' })
  @IsOptional()
  @IsString()
  deviceType?: string;
}

export class BarberServiceSelectionDto {
  @ApiProperty({ description: 'Service ID (MongoDB ObjectId)' })
  @IsMongoId()
  serviceId: string;

  @ApiProperty({ description: 'Custom price for this service' })
  @IsNumber()
  @Min(0)
  price: number;
}

export class LocationDto {
  @ApiProperty({ description: 'Longitude' })
  @IsNumber()
  longitude: number;

  @ApiProperty({ description: 'Latitude' })
  @IsNumber()
  latitude: number;
}

export class BarberSignUpDto {
  @ApiProperty({ description: 'Barber full name' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Shop name' })
  @IsString()
  shopName: string;

  @ApiProperty({ description: 'Barber email address' })
  @IsEmail()
  email: string;

  @ApiProperty({ description: 'Barber phone number' })
  @IsPhoneNumber()
  phone: string;

  @ApiProperty({ description: 'Barber password', minLength: 8 })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({ description: 'Profile image URL' })
  @IsString()
  profileImage: string;

  @ApiProperty({ description: 'First identification document URL' })
  @IsString()
  idDocument1: string;

  @ApiProperty({ description: 'Second identification document URL' })
  @IsString()
  idDocument2: string;

  @ApiProperty({ description: 'Barber location' })
  @ValidateNested()
  @Type(() => LocationDto)
  location: LocationDto;

  @ApiProperty({ description: 'Years of experience' })
  @IsNumber()
  @Min(0)
  yearsOfExperience: number;

  @ApiProperty({ description: 'Selected services with custom pricing', type: [BarberServiceSelectionDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BarberServiceSelectionDto)
  services: BarberServiceSelectionDto[];

  @ApiPropertyOptional({ description: 'Device ID for refresh token tracking' })
  @IsOptional()
  @IsString()
  deviceId?: string;

  @ApiPropertyOptional({ description: 'Device name' })
  @IsOptional()
  @IsString()
  deviceName?: string;

  @ApiPropertyOptional({ description: 'Device type' })
  @IsOptional()
  @IsString()
  deviceType?: string;
}

export class AuthResponseDto {
  @ApiProperty({ description: 'Access token' })
  accessToken: string;

  @ApiProperty({ description: 'Refresh token' })
  refreshToken: string;

  @ApiProperty({ description: 'Token type' })
  tokenType: string = 'Bearer';

  @ApiProperty({ description: 'Token expiration time in seconds' })
  expiresIn: number;

  @ApiProperty({ description: 'User information' })
  user: {
    id: string;
    email?: string;
    phone?: string;
    name: string;
    role: UserRole;
    isVerified: boolean;
    avatarUrl?: string;
  };
}
