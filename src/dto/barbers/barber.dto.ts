import { IsString, IsOptional, IsNumber, IsArray, IsBoolean, IsObject, ValidateNested, Min, Max, IsEnum, IsMongoId } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LocationDto {
  @ApiProperty({ description: 'Longitude' })
  @IsNumber()
  longitude: number;

  @ApiProperty({ description: 'Latitude' })
  @IsNumber()
  latitude: number;
}

export class DayAvailabilityDto {
  @ApiProperty({ description: 'Is available on this day' })
  @IsBoolean()
  isAvailable: boolean;

  @ApiProperty({ description: 'Start time (HH:MM format)' })
  @IsString()
  startTime: string;

  @ApiProperty({ description: 'End time (HH:MM format)' })
  @IsString()
  endTime: string;

  @ApiPropertyOptional({ description: 'Break periods', type: [Object] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BreakPeriodDto)
  breaks?: BreakPeriodDto[];
}

export class BreakPeriodDto {
  @ApiProperty({ description: 'Break start time (HH:MM format)' })
  @IsString()
  startTime: string;

  @ApiProperty({ description: 'Break end time (HH:MM format)' })
  @IsString()
  endTime: string;
}

export class AvailabilityDto {
  @ApiProperty({ description: 'Monday availability' })
  @ValidateNested()
  @Type(() => DayAvailabilityDto)
  monday: DayAvailabilityDto;

  @ApiProperty({ description: 'Tuesday availability' })
  @ValidateNested()
  @Type(() => DayAvailabilityDto)
  tuesday: DayAvailabilityDto;

  @ApiProperty({ description: 'Wednesday availability' })
  @ValidateNested()
  @Type(() => DayAvailabilityDto)
  wednesday: DayAvailabilityDto;

  @ApiProperty({ description: 'Thursday availability' })
  @ValidateNested()
  @Type(() => DayAvailabilityDto)
  thursday: DayAvailabilityDto;

  @ApiProperty({ description: 'Friday availability' })
  @ValidateNested()
  @Type(() => DayAvailabilityDto)
  friday: DayAvailabilityDto;

  @ApiProperty({ description: 'Saturday availability' })
  @ValidateNested()
  @Type(() => DayAvailabilityDto)
  saturday: DayAvailabilityDto;

  @ApiProperty({ description: 'Sunday availability' })
  @ValidateNested()
  @Type(() => DayAvailabilityDto)
  sunday: DayAvailabilityDto;
}

export class BarberServiceDto {
  @ApiProperty({ description: 'Service ID (MongoDB ObjectId)' })
  @IsMongoId()
  serviceId: string;

  @ApiProperty({ description: 'Service price' })
  @IsNumber()
  @Min(0)
  price: number;
}

export class BankDetailsDto {
  @ApiProperty({ description: 'Bank name' })
  @IsString()
  bankName: string;

  @ApiProperty({ description: 'Account number' })
  @IsString()
  accountNumber: string;

  @ApiProperty({ description: 'Routing number' })
  @IsString()
  routingNumber: string;

  @ApiProperty({ description: 'Account holder name' })
  @IsString()
  accountHolderName: string;
}

export class CreateBarberDto {
  @ApiProperty({ description: 'Barber location' })
  @ValidateNested()
  @Type(() => LocationDto)
  location: LocationDto;

  @ApiProperty({ description: 'Barber services', type: [BarberServiceDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BarberServiceDto)
  services: BarberServiceDto[];

  @ApiPropertyOptional({ description: 'Experience in years' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  experienceYears?: number;

  @ApiPropertyOptional({ description: 'Profile images', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @ApiPropertyOptional({ description: 'Bio description' })
  @IsOptional()
  @IsString()
  bio?: string;

  @ApiPropertyOptional({ description: 'Specialties', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  specialties?: string[];

  @ApiPropertyOptional({ description: 'Commission rate (0-1)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  commissionRate?: number;

  @ApiPropertyOptional({ description: 'Service radius in kilometers' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  serviceRadius?: number;

  @ApiPropertyOptional({ description: 'Bank details for payouts' })
  @IsOptional()
  @ValidateNested()
  @Type(() => BankDetailsDto)
  bankDetails?: BankDetailsDto;
}

export class UpdateBarberDto {
  @ApiPropertyOptional({ description: 'Barber location' })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocationDto)
  location?: LocationDto;

  @ApiPropertyOptional({ description: 'Barber services', type: [BarberServiceDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BarberServiceDto)
  services?: BarberServiceDto[];

  @ApiPropertyOptional({ description: 'Availability schedule' })
  @IsOptional()
  @ValidateNested()
  @Type(() => AvailabilityDto)
  availability?: AvailabilityDto;

  @ApiPropertyOptional({ description: 'Experience in years' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  experienceYears?: number;

  @ApiPropertyOptional({ description: 'Profile images', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @ApiPropertyOptional({ description: 'Bio description' })
  @IsOptional()
  @IsString()
  bio?: string;

  @ApiPropertyOptional({ description: 'Specialties', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  specialties?: string[];

  @ApiPropertyOptional({ description: 'Is barber online' })
  @IsOptional()
  @IsBoolean()
  isOnline?: boolean;

  @ApiPropertyOptional({ description: 'Commission rate (0-1)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  commissionRate?: number;

  @ApiPropertyOptional({ description: 'Service radius in kilometers' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  serviceRadius?: number;

  @ApiPropertyOptional({ description: 'Bank details for payouts' })
  @IsOptional()
  @ValidateNested()
  @Type(() => BankDetailsDto)
  bankDetails?: BankDetailsDto;
}

export class SearchBarbersDto {
  @ApiProperty({ description: 'Latitude for location search' })
  @IsNumber()
  latitude: number;

  @ApiProperty({ description: 'Longitude for location search' })
  @IsNumber()
  longitude: number;

  @ApiPropertyOptional({ description: 'Search radius in kilometers', default: 10 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  radius?: number = 10;

  @ApiPropertyOptional({ description: 'Service ID to filter by (MongoDB ObjectId)' })
  @IsOptional()
  @IsMongoId()
  serviceId?: string;

  @ApiPropertyOptional({ description: 'Minimum rating', minimum: 0, maximum: 5 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(5)
  minRating?: number;

  @ApiPropertyOptional({ description: 'Sort by', enum: ['distance', 'rating', 'price', 'availability'] })
  @IsOptional()
  @IsEnum(['distance', 'rating', 'price', 'availability'])
  sortBy?: 'distance' | 'rating' | 'price' | 'availability' = 'distance';

  @ApiPropertyOptional({ description: 'Sort order', enum: ['asc', 'desc'] })
  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'asc';

  @ApiPropertyOptional({ description: 'Page number', minimum: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', minimum: 1, maximum: 50 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(50)
  limit?: number = 10;
}

export class BarberResponseDto {
  @ApiProperty({ description: 'Barber ID' })
  id: string;

  @ApiProperty({ description: 'User ID' })
  userId: string;

  @ApiProperty({ description: 'Barber location' })
  location: {
    type: 'Point';
    coordinates: [number, number];
  };

  @ApiProperty({ description: 'Barber services' })
  services: Array<{
    serviceId: string;
    price: number;
  }>;

  @ApiProperty({ description: 'Average rating' })
  rating: number;

  @ApiProperty({ description: 'Number of reviews' })
  reviewsCount: number;

  @ApiProperty({ description: 'Availability schedule' })
  availability: AvailabilityDto;

  @ApiPropertyOptional({ description: 'Experience in years' })
  experienceYears?: number;

  @ApiPropertyOptional({ description: 'Profile images' })
  images?: string[];

  @ApiPropertyOptional({ description: 'Bio description' })
  bio?: string;

  @ApiPropertyOptional({ description: 'Specialties' })
  specialties?: string[];

  @ApiProperty({ description: 'Is barber active' })
  isActive: boolean;

  @ApiProperty({ description: 'Is barber online' })
  isOnline: boolean;

  @ApiPropertyOptional({ description: 'Last seen date' })
  lastSeenAt?: Date;

  @ApiProperty({ description: 'Commission rate' })
  commissionRate: number;

  @ApiProperty({ description: 'Service radius in kilometers' })
  serviceRadius: number;

  @ApiProperty({ description: 'Created date' })
  createdAt: Date;

  @ApiProperty({ description: 'Updated date' })
  updatedAt: Date;

  // Distance from search location (calculated)
  @ApiPropertyOptional({ description: 'Distance from search location in kilometers' })
  distance?: number;
}
