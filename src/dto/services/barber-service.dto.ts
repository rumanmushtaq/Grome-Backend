import { IsString, IsNumber, IsArray, IsBoolean, IsOptional, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PricingTierDto {
  @ApiProperty({ description: 'Tier name' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Tier price' })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiProperty({ description: 'Tier duration in minutes' })
  @IsNumber()
  @Min(15)
  duration: number;

  @ApiPropertyOptional({ description: 'Tier description' })
  @IsOptional()
  @IsString()
  description?: string;
}

export class ServiceRequirementsDto {
  @ApiProperty({ description: 'Requires consultation' })
  @IsBoolean()
  requiresConsultation: boolean;

  @ApiProperty({ description: 'Requires preparation' })
  @IsBoolean()
  requiresPreparation: boolean;

  @ApiProperty({ description: 'Preparation time in minutes' })
  @IsNumber()
  @Min(0)
  preparationTime: number;

  @ApiProperty({ description: 'Required equipment', type: [String] })
  @IsArray()
  @IsString({ each: true })
  equipment: string[];

  @ApiProperty({ description: 'Required skills', type: [String] })
  @IsArray()
  @IsString({ each: true })
  skills: string[];
}

export class ServiceAvailabilityDto {
  @ApiProperty({ description: 'Is service available' })
  @IsBoolean()
  isAvailable: boolean;

  @ApiPropertyOptional({ description: 'Available from date' })
  @IsOptional()
  @IsString()
  availableFrom?: string;

  @ApiPropertyOptional({ description: 'Available to date' })
  @IsOptional()
  @IsString()
  availableTo?: string;

  @ApiProperty({ description: 'Maximum bookings per day (0 = unlimited)' })
  @IsNumber()
  @Min(0)
  maxBookingsPerDay: number;
}

export class BarberServiceUpdateDto {
  @ApiProperty({ description: 'Service ID (MongoDB ObjectId)' })
  @IsString()
  serviceId: string;

  @ApiProperty({ description: 'Custom price for this service' })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiPropertyOptional({ description: 'Service description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Service images', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @ApiPropertyOptional({ description: 'Pricing tiers', type: [PricingTierDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PricingTierDto)
  pricingTiers?: PricingTierDto[];

  @ApiPropertyOptional({ description: 'Service requirements' })
  @IsOptional()
  @ValidateNested()
  @Type(() => ServiceRequirementsDto)
  requirements?: ServiceRequirementsDto;

  @ApiPropertyOptional({ description: 'Service availability' })
  @IsOptional()
  @ValidateNested()
  @Type(() => ServiceAvailabilityDto)
  availability?: ServiceAvailabilityDto;
}

export class BarberServiceResponseDto {
  @ApiProperty({ description: 'Service ID' })
  serviceId: string;

  @ApiProperty({ description: 'Service title' })
  title: string;

  @ApiProperty({ description: 'Service description' })
  description?: string;

  @ApiProperty({ description: 'Base price' })
  basePrice: number;

  @ApiProperty({ description: 'Barber custom price' })
  price: number;

  @ApiProperty({ description: 'Service duration in minutes' })
  durationMinutes: number;

  @ApiProperty({ description: 'Service category' })
  category: string;

  @ApiProperty({ description: 'Service tags' })
  tags: string[];

  @ApiProperty({ description: 'Service icon URL' })
  iconUrl?: string;

  @ApiProperty({ description: 'Service images' })
  images?: string[];

  @ApiProperty({ description: 'Pricing tiers' })
  pricingTiers?: PricingTierDto[];

  @ApiProperty({ description: 'Service requirements' })
  requirements?: ServiceRequirementsDto;

  @ApiProperty({ description: 'Service availability' })
  availability?: ServiceAvailabilityDto;

  @ApiProperty({ description: 'Is service active' })
  isActive: boolean;

  @ApiProperty({ description: 'Average rating' })
  averageRating: number;

  @ApiProperty({ description: 'Bookings count' })
  bookingsCount: number;
}
