import { IsString, IsNumber, IsArray, IsEnum, IsOptional, Min, IsUrl } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ServiceCategory } from '../../schemas/service.schema';

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

  @ApiProperty({ description: 'Service category', enum: ServiceCategory })
  @IsEnum(ServiceCategory)
  category: ServiceCategory;

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

  @ApiPropertyOptional({ description: 'Service category', enum: ServiceCategory })
  @IsOptional()
  @IsEnum(ServiceCategory)
  category?: ServiceCategory;

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
  @IsString()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Sort order for display' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  sortOrder?: number;
}
