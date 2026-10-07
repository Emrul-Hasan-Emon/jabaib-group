import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export const HOMEPAGE_SECTION_TYPES = [
  'products',
  'categories',
  'banners',
  'custom',
] as const;

export class CreateHomepageSectionDto {
  @ApiProperty({ example: 'new-arrivals' })
  @IsString()
  @MaxLength(100)
  key: string;

  @ApiProperty({ example: 'New Arrivals' })
  @IsString()
  @MaxLength(250)
  title: string;

  @ApiPropertyOptional({ example: 'নতুন আগমন' })
  @IsOptional()
  @IsString()
  @MaxLength(250)
  titleBN?: string;

  @ApiProperty({ enum: HOMEPAGE_SECTION_TYPES })
  @IsIn(HOMEPAGE_SECTION_TYPES)
  type: string;

  /** e.g. { productIds: [1,2], limit: 8 } or { categoryIds: [3] } */
  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  content?: Record<string, unknown>;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
