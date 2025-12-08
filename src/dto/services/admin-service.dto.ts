import { IsString, IsNumber, IsArray, IsEnum, IsOptional, Min, IsUrl, IsInt, IsBoolean, IsMongoId } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';


export class AdminCreateServiceDto {
  @ApiProperty({ description: 'Service title/name' })
  @IsString()
  title: string;

  @ApiProperty({ description: 'Base price for the service' })
  @IsNumber()
  @Min(0)
  basePrice: number;

  @ApiProperty({ description: 'Service icon URL' })
  @IsUrl()
  icon: string;

  @ApiProperty({ 
    description: 'MongoDB Category ID', 
    example: '671f0be6d3afbdc40139d987' 
  })
  @IsMongoId()
  categoryId: string;

  @ApiProperty({ description: 'Service duration in minutes' })
  @IsInt()
  @Min(5)
  durationMinutes: number;

  @ApiProperty({ description: 'Service tags', type: [String] })
  @IsArray()
  @IsString({ each: true })
  tags: string[];
}

export class AdminUpdateServiceDto {
  @ApiPropertyOptional({ description: 'Service title/name' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ description: 'Base price for the service' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  basePrice?: number;

  @ApiPropertyOptional({ description: 'Service icon URL' })
  @IsOptional()
  @IsUrl()
  icon?: string;

    // ✅ FIX HERE
  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  categoryIds?: string[];

  @ApiPropertyOptional({ description: 'Service tags', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: 'Service description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Service images', type: [String] })
  @IsOptional()
  @IsArray()
  @IsUrl({}, { each: true })
  images?: string[];

  @ApiPropertyOptional({ description: 'Is service active' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Sort order for display' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  sortOrder?: number;
}
