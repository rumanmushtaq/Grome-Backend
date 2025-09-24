import { IsEmail, IsString, IsOptional, IsPhoneNumber, IsEnum, IsBoolean, IsObject, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole, VerificationStatus } from '../../schemas/user.schema';

export class NotificationPreferencesDto {
  @ApiPropertyOptional({ description: 'Email notifications enabled' })
  @IsOptional()
  @IsBoolean()
  email?: boolean;

  @ApiPropertyOptional({ description: 'Push notifications enabled' })
  @IsOptional()
  @IsBoolean()
  push?: boolean;

  @ApiPropertyOptional({ description: 'SMS notifications enabled' })
  @IsOptional()
  @IsBoolean()
  sms?: boolean;
}

export class UpdateProfileDto {
  @ApiPropertyOptional({ description: 'User full name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'User email address' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ description: 'User phone number' })
  @IsOptional()
  @IsPhoneNumber()
  phone?: string;

  @ApiPropertyOptional({ description: 'User avatar URL' })
  @IsOptional()
  @IsString()
  avatarUrl?: string;
}

export class UpdatePreferencesDto {
  @ApiPropertyOptional({ description: 'Notification preferences' })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => NotificationPreferencesDto)
  notifications?: NotificationPreferencesDto;

  @ApiPropertyOptional({ description: 'User language preference' })
  @IsOptional()
  @IsString()
  language?: string;

  @ApiPropertyOptional({ description: 'User timezone' })
  @IsOptional()
  @IsString()
  timezone?: string;
}

export class BarberVerificationDto {
  @ApiProperty({ description: 'ID document URL' })
  @IsString()
  idDocUrl: string;

  @ApiProperty({ description: 'Certificate URLs', type: [String] })
  @IsString({ each: true })
  certificateUrls: string[];

  @ApiPropertyOptional({ description: 'Additional notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateBarberVerificationDto {
  @ApiProperty({ description: 'Verification status', enum: VerificationStatus })
  @IsEnum(VerificationStatus)
  status: VerificationStatus;

  @ApiPropertyOptional({ description: 'Review notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UserResponseDto {
  @ApiProperty({ description: 'User ID' })
  id: string;

  @ApiPropertyOptional({ description: 'User email' })
  email?: string;

  @ApiPropertyOptional({ description: 'User phone' })
  phone?: string;

  @ApiProperty({ description: 'User name' })
  name: string;

  @ApiProperty({ description: 'User role', enum: UserRole })
  role: UserRole;

  @ApiProperty({ description: 'Is user verified' })
  isVerified: boolean;

  @ApiProperty({ description: 'Is user active' })
  isActive: boolean;

  @ApiPropertyOptional({ description: 'Avatar URL' })
  avatarUrl?: string;

  @ApiPropertyOptional({ description: 'Last login date' })
  lastLoginAt?: Date;

  @ApiPropertyOptional({ description: 'Email verified date' })
  emailVerifiedAt?: Date;

  @ApiPropertyOptional({ description: 'Phone verified date' })
  phoneVerifiedAt?: Date;

  @ApiPropertyOptional({ description: 'User preferences' })
  preferences?: {
    notifications: {
      email: boolean;
      push: boolean;
      sms: boolean;
    };
    language: string;
    timezone: string;
  };

  @ApiPropertyOptional({ description: 'Verification information' })
  verification?: {
    status: VerificationStatus;
    idDocUrl?: string;
    certificateUrls?: string[];
    notes?: string;
    submittedAt?: Date;
    reviewedAt?: Date;
  };

  @ApiProperty({ description: 'Created date' })
  createdAt: Date;

  @ApiProperty({ description: 'Updated date' })
  updatedAt: Date;
}
