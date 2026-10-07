import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateBannerDto {
  @ApiProperty({ example: 'Eid Sale 2026' })
  @IsString()
  @MaxLength(250)
  title: string;

  @ApiPropertyOptional({ example: 'ঈদ সেল ২০২৬' })
  @IsOptional()
  @IsString()
  @MaxLength(250)
  titleBN?: string;

  @ApiProperty({ example: '/uploads/banners/eid-desktop.jpg' })
  @IsString()
  imageUrl: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  imagePath?: string;

  @ApiPropertyOptional({ example: '/uploads/banners/eid-mobile.jpg' })
  @IsOptional()
  @IsString()
  mobileImageUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  mobileImagePath?: string;

  @ApiPropertyOptional({ example: '/collections/sale' })
  @IsOptional()
  @IsString()
  linkUrl?: string;

  /** "hero" | "side" | "popup" ... */
  @ApiPropertyOptional({ example: 'hero' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  position?: string;

  @ApiPropertyOptional({ example: '2026-10-01T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  startsAt?: string;

  @ApiPropertyOptional({ example: '2026-11-30T23:59:59.000Z' })
  @IsOptional()
  @IsDateString()
  endsAt?: string;

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
