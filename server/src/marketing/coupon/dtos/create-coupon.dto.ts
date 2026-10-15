import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { CouponType } from '../../../database/enums/enums';

export class CreateCouponDto {
  @ApiProperty({ example: 'WELCOME10' })
  @IsString()
  @MaxLength(50)
  code: string;

  @ApiProperty({ enum: CouponType })
  @IsIn(Object.values(CouponType))
  type: string;

  /** For flat: fixed amount off. For percent: percentage (0–100). */
  @ApiProperty({ example: 10 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiPropertyOptional({ example: 500 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minOrderAmount?: number;

  @ApiPropertyOptional({ description: 'Cap for percent coupons', example: 200 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxDiscountAmount?: number;

  @ApiPropertyOptional({ description: '0 = unlimited', default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  usageLimit?: number;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  perUserLimit?: number;

  @ApiPropertyOptional({ example: '2026-10-01T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  startsAt?: string;

  @ApiPropertyOptional({ example: '2026-12-31T23:59:59.000Z' })
  @IsOptional()
  @IsDateString()
  endsAt?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
