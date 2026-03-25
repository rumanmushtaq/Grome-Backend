import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateBookingPaymentDto {
  @ApiProperty({ example: 'barber_12345' })
  barberId: string;

  @ApiProperty({
    example: [
      {
        serviceId: 'service_1',
        price: 500,
        duration: 30,
        name: 'Haircut',
      },
    ],
  })
  services: Array<{
    serviceId: string;
    price: number;
    duration: number;
    name: string;
  }>;

  @ApiProperty({ example: '2026-03-30T14:00:00Z' })
  scheduledAt: string;

  @ApiPropertyOptional({ example: 'home_service' })
  type?: string;

  @ApiPropertyOptional({
    example: {
      longitude: 73.0479,
      latitude: 33.6844,
      address: 'Street 1, F-10',
      city: 'Islamabad',
      postalCode: '44000',
      country: 'Pakistan',
    },
  })
  location?: {
    longitude: number;
    latitude: number;
    address?: string;
    city?: string;
    postalCode?: string;
    country?: string;
  };

  @ApiPropertyOptional({ example: 'Please bring your own tools' })
  specialRequests?: string;

  @ApiPropertyOptional({ example: 'Customer prefers evening appointments' })
  customerNotes?: string;

  @ApiPropertyOptional({ example: 'PROMO123' })
  promoCodeId?: string;
}