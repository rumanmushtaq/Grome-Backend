import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsUrl,
  IsDateString,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional, PartialType } from "@nestjs/swagger";

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

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsDateString()
  startDate?: Date;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsDateString()
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

  @ApiPropertyOptional({ example: "asd" })
  @IsOptional()
  @IsDateString()
  startDate?: Date;

  @ApiPropertyOptional({ example: "asd" })
  @IsOptional()
  @IsDateString()
  endDate?: Date;
}




export class UpdateStatusDto {
  @ApiProperty({ example: true })
  @IsBoolean()
  isActive: boolean;
}