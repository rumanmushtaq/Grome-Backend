import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class ServiceDto {
  @ApiProperty({ example: 'service_1' })
  serviceId: string;

  @ApiProperty({ example: 500 })
  price: number;

  @ApiProperty({ example: 30 })
  duration: number;

  @ApiProperty({ example: 'Haircut' })
  name: string;
}

class LocationDto {
  @ApiProperty({ example: 73.0479 })
  longitude: number;

  @ApiProperty({ example: 33.6844 })
  latitude: number;

  @ApiPropertyOptional({ example: 'Street 1, F-10' })
  address?: string;

  @ApiPropertyOptional({ example: 'Islamabad' })
  city?: string;

  @ApiPropertyOptional({ example: '44000' })
  postalCode?: string;

  @ApiPropertyOptional({ example: 'Pakistan' })
  country?: string;
}

export class CreateBookingPaymentDto {
  @ApiProperty({ example: 'barber_12345' })
  barberId: string;

  @ApiProperty({ type: [ServiceDto] })
  services: ServiceDto[];

  @ApiProperty({ example: '2026-03-30T14:00:00Z' })
  scheduledAt: string;

  @ApiPropertyOptional({ example: 'home_service' })
  type?: string;

  @ApiPropertyOptional({ type: LocationDto })
  location?: LocationDto;

  @ApiPropertyOptional({ example: 'Please bring your own tools' })
  specialRequests?: string;

  @ApiPropertyOptional({ example: 'Customer prefers evening appointments' })
  customerNotes?: string;

  @ApiPropertyOptional({ example: 'PROMO123' })
  promoCodeId?: string;
}