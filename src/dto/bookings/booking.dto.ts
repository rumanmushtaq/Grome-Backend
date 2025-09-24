import { IsString, IsOptional, IsNumber, IsArray, IsEnum, IsDateString, IsObject, ValidateNested, Min, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BookingStatus, BookingType } from '../../schemas/booking.schema';

export class BookingServiceDto {
  @ApiProperty({ description: 'Service ID' })
  @IsString()
  serviceId: string;

  @ApiProperty({ description: 'Service price' })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiProperty({ description: 'Service duration in minutes' })
  @IsNumber()
  @Min(15)
  duration: number;

  @ApiProperty({ description: 'Service name' })
  @IsString()
  name: string;
}

export class BookingLocationDto {
  @ApiProperty({ description: 'Longitude' })
  @IsNumber()
  longitude: number;

  @ApiProperty({ description: 'Latitude' })
  @IsNumber()
  latitude: number;

  @ApiPropertyOptional({ description: 'Address' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ description: 'City' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ description: 'Postal code' })
  @IsOptional()
  @IsString()
  postalCode?: string;

  @ApiPropertyOptional({ description: 'Country' })
  @IsOptional()
  @IsString()
  country?: string;
}

export class CreateBookingDto {
  @ApiProperty({ description: 'Barber ID' })
  @IsString()
  barberId: string;

  @ApiProperty({ description: 'Booking services', type: [BookingServiceDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BookingServiceDto)
  services: BookingServiceDto[];

  @ApiProperty({ description: 'Scheduled date and time' })
  @IsDateString()
  scheduledAt: string;

  @ApiPropertyOptional({ description: 'Booking type', enum: BookingType })
  @IsOptional()
  @IsEnum(BookingType)
  type?: BookingType = BookingType.SCHEDULED;

  @ApiPropertyOptional({ description: 'Booking location' })
  @IsOptional()
  @ValidateNested()
  @Type(() => BookingLocationDto)
  location?: BookingLocationDto;

  @ApiPropertyOptional({ description: 'Special requests' })
  @IsOptional()
  @IsString()
  specialRequests?: string;

  @ApiPropertyOptional({ description: 'Customer notes' })
  @IsOptional()
  @IsString()
  customerNotes?: string;

  @ApiPropertyOptional({ description: 'Promo code ID' })
  @IsOptional()
  @IsString()
  promoCodeId?: string;
}

export class UpdateBookingDto {
  @ApiPropertyOptional({ description: 'Booking status', enum: BookingStatus })
  @IsOptional()
  @IsEnum(BookingStatus)
  status?: BookingStatus;

  @ApiPropertyOptional({ description: 'Scheduled date and time' })
  @IsOptional()
  @IsDateString()
  scheduledAt?: string;

  @ApiPropertyOptional({ description: 'Booking location' })
  @IsOptional()
  @ValidateNested()
  @Type(() => BookingLocationDto)
  location?: BookingLocationDto;

  @ApiPropertyOptional({ description: 'Special requests' })
  @IsOptional()
  @IsString()
  specialRequests?: string;

  @ApiPropertyOptional({ description: 'Customer notes' })
  @IsOptional()
  @IsString()
  customerNotes?: string;

  @ApiPropertyOptional({ description: 'Barber notes' })
  @IsOptional()
  @IsString()
  barberNotes?: string;

  @ApiPropertyOptional({ description: 'Cancellation reason' })
  @IsOptional()
  @IsString()
  cancellationReason?: string;
}

export class BookingQueryDto {
  @ApiPropertyOptional({ description: 'Booking status', enum: BookingStatus })
  @IsOptional()
  @IsEnum(BookingStatus)
  status?: BookingStatus;

  @ApiPropertyOptional({ description: 'Booking type', enum: BookingType })
  @IsOptional()
  @IsEnum(BookingType)
  type?: BookingType;

  @ApiPropertyOptional({ description: 'Start date (ISO string)' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date (ISO string)' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Barber ID' })
  @IsOptional()
  @IsString()
  barberId?: string;

  @ApiPropertyOptional({ description: 'Customer ID' })
  @IsOptional()
  @IsString()
  customerId?: string;

  @ApiPropertyOptional({ description: 'Page number', minimum: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', minimum: 1, maximum: 50 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @IsNumber()
  limit?: number = 10;

  @ApiPropertyOptional({ description: 'Sort by', enum: ['scheduledAt', 'createdAt', 'status'] })
  @IsOptional()
  @IsEnum(['scheduledAt', 'createdAt', 'status'])
  sortBy?: 'scheduledAt' | 'createdAt' | 'status' = 'scheduledAt';

  @ApiPropertyOptional({ description: 'Sort order', enum: ['asc', 'desc'] })
  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';
}

export class BookingResponseDto {
  @ApiProperty({ description: 'Booking ID' })
  id: string;

  @ApiProperty({ description: 'Customer ID' })
  customerId: string;

  @ApiProperty({ description: 'Barber ID' })
  barberId: string;

  @ApiProperty({ description: 'Booking services' })
  services: Array<{
    serviceId: string;
    price: number;
    duration: number;
    name: string;
  }>;

  @ApiProperty({ description: 'Scheduled date and time' })
  scheduledAt: Date;

  @ApiProperty({ description: 'Booking status', enum: BookingStatus })
  status: BookingStatus;

  @ApiProperty({ description: 'Booking type', enum: BookingType })
  type: BookingType;

  @ApiPropertyOptional({ description: 'Booking location' })
  location?: {
    type: 'Point';
    coordinates: [number, number];
    address?: string;
    city?: string;
    postalCode?: string;
    country?: string;
  };

  @ApiPropertyOptional({ description: 'Estimated time of arrival' })
  eta?: Date;

  @ApiPropertyOptional({ description: 'Started date and time' })
  startedAt?: Date;

  @ApiPropertyOptional({ description: 'Completed date and time' })
  completedAt?: Date;

  @ApiPropertyOptional({ description: 'Cancelled date and time' })
  cancelledAt?: Date;

  @ApiPropertyOptional({ description: 'Cancellation reason' })
  cancellationReason?: string;

  @ApiProperty({ description: 'Payment information' })
  payment: {
    status: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded';
    amount: number;
    currency: string;
    stripePaymentId?: string;
    stripePaymentIntentId?: string;
    commission: number;
    payoutAmount: number;
    refundAmount: number;
    refundReason?: string;
    refundedAt?: Date;
  };

  @ApiPropertyOptional({ description: 'Special requests' })
  specialRequests?: string;

  @ApiPropertyOptional({ description: 'Customer notes' })
  customerNotes?: string;

  @ApiPropertyOptional({ description: 'Barber notes' })
  barberNotes?: string;

  @ApiPropertyOptional({ description: 'Promo code ID' })
  promoCodeId?: string;

  @ApiProperty({ description: 'Discount amount' })
  discountAmount: number;

  @ApiPropertyOptional({ description: 'Customer rating' })
  customerRating?: number;

  @ApiPropertyOptional({ description: 'Customer review' })
  customerReview?: string;

  @ApiPropertyOptional({ description: 'Barber rating' })
  barberRating?: number;

  @ApiPropertyOptional({ description: 'Barber review' })
  barberReview?: string;

  @ApiPropertyOptional({ description: 'Conversation ID' })
  conversationId?: string;

  @ApiProperty({ description: 'Source' })
  source: string;

  @ApiProperty({ description: 'Is recurring booking' })
  isRecurring: boolean;

  @ApiPropertyOptional({ description: 'Recurring pattern' })
  recurringPattern?: string;

  @ApiPropertyOptional({ description: 'Recurring end date' })
  recurringEndDate?: Date;

  @ApiProperty({ description: 'Created date' })
  createdAt: Date;

  @ApiProperty({ description: 'Updated date' })
  updatedAt: Date;
}
