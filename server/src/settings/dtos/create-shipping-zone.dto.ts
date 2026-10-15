import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { DeliveryType } from '../../database/enums/enums';

export class CreateShippingZoneDto {
  @ApiProperty({ example: 'Inside Dhaka' })
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({ example: 'ঢাকার ভিতরে' })
  @IsOptional()
  @IsString()
  @MaxLength(250)
  nameBN?: string;

  @ApiProperty({ enum: DeliveryType })
  @IsIn(Object.values(DeliveryType))
  code: string;

  @ApiProperty({ example: 60 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  charge: number;

  @ApiPropertyOptional({ example: 2 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  estimatedDays?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
