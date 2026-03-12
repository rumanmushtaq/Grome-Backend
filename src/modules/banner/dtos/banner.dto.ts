import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsUrl,
  IsDate,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import { Type } from "class-transformer";

export class CreateBannerDto {
  @ApiPropertyOptional({ example: "20% percent off" })
  @IsString()
  title: string;

  @ApiProperty({ example: "20% percent off" })
  @IsOptional()
  @IsString()
  subtitle?: string;

  @ApiProperty({ example: "20% percent off" })
  @IsString()
  @IsUrl()
  imageUrl: string;

  @ApiPropertyOptional({ example: "20% percent off" })
  @IsOptional()
  @IsUrl()
  redirectUrl?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsNumber()
  order?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ example: "2026-03-15T00:00:00.000Z" })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  startDate?: Date;

  @ApiPropertyOptional({ example: "2026-03-31T23:59:59.000Z" })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  endDate?: Date;
}

export class UpdateBannerDto {
  @ApiPropertyOptional({ example: "20% percent off" })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ example: "20% percent off" })
  @IsOptional()
  @IsString()
  subtitle?: string;

  @ApiPropertyOptional({ example: "20% percent off" })
  @IsOptional()
  @IsUrl()
  imageUrl?: string;

  @ApiPropertyOptional({ example: "20% percent off" })
  @IsOptional()
  @IsUrl()
  redirectUrl?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsNumber()
  order?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ example: "2026-03-15T00:00:00.000Z" })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  startDate?: Date;

  @ApiPropertyOptional({ example: "2026-03-31T23:59:59.000Z" })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  endDate?: Date;
}




export class UpdateStatusDto {
  @ApiProperty({ example: true })
  @IsBoolean()
  isActive: boolean;
}