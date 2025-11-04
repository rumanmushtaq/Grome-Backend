import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateConversationDto {
  @ApiProperty({
    description: 'ID of the barber to start the conversation with',
    example: '65b7cdbf1d0e4c001f98d20a',
  })
  @IsString()
  @IsNotEmpty()
  barberId: string;

  @ApiPropertyOptional({
    description: 'Optional booking ID related to the conversation',
    example: '65b7cdbf1d0e4c001f98d21b',
  })
  @IsString()
  @IsOptional()
  bookingId?: string;
}
