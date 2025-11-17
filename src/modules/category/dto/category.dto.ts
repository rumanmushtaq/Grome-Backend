import { ApiProperty, ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  Min,
  IsBooleanString,
} from "class-validator";

export class CreateCategoryDto {
  @ApiProperty({ example: "Haircut" })
  @IsString()
  name: string;

  @ApiProperty({ example: "haircut" })
  @IsString()
  slug: string;

  @ApiProperty({ example: "https://example.com/haircut.png" })
  @IsString()
  iconUrl: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  sortOrder?: number;
}

export class UpdateCategoryDto extends PartialType(CreateCategoryDto) {}

export class CategoryQueryDto {
  @IsOptional()
  @IsBooleanString()
  isActive?: string; // "true" | "false"

  @IsOptional()
  @IsString()
  search?: string;
}

export class UpdateCategoryStatusDto {
  @ApiProperty({ example: true })
  @IsBoolean()
  isActive: boolean;
}
