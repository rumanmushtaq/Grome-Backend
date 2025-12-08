// barber-availability.dto.ts
import { IsNotEmpty, IsNumber, IsString, Min } from 'class-validator';

export class GetBarberAvailabilityDto {
  @IsNotEmpty()
  @IsString()
  barberId: string;

  @IsNotEmpty()
  @IsString()
  date: string; // YYYY-MM-DD

  @IsNotEmpty()
  @IsNumber()
  @Min(15)
  duration: number; // slot duration in minutes
}
