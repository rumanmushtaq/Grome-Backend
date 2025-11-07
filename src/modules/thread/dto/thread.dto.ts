import { ApiProperty } from '@nestjs/swagger';
import { IsMongoId } from 'class-validator';

export class CreateThreadDto {
  @ApiProperty()
  @IsMongoId()
  barbarId: string;

  @ApiProperty()
  @IsMongoId()
  customerId: string;
}
