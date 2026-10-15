import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateSystemSettingDto {
  @ApiProperty({ example: 'site_name' })
  @IsString()
  @MaxLength(100)
  key: string;

  @ApiProperty({ example: 'Jabaib' })
  @IsOptional()
  @IsString()
  value?: string;

  @ApiPropertyOptional({ example: 'Brand name shown in the storefront header' })
  @IsOptional()
  @IsString()
  @MaxLength(250)
  description?: string;

  @ApiPropertyOptional({ example: 'স্টোরফ্রন্ট হেডারে দেখানো ব্র্যান্ডের নাম' })
  @IsOptional()
  @IsString()
  @MaxLength(250)
  descriptionBN?: string;

  @ApiPropertyOptional({ example: 'general' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  group?: string;
}

export const SYSTEM_SETTING_GROUPS = [
  'general',
  'contact',
  'shipping',
  'payment',
  'social',
] as const;
