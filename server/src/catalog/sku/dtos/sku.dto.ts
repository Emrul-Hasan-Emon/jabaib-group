import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Min,
  ValidateNested,
} from 'class-validator';

export class SkuVariantPairDto {
  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  attributeId: number;

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  attributeValueId: number;
}

export class CreateSkuDto {
  @ApiProperty({ example: 'TSH-RED-M' })
  @IsString()
  @Matches(/^[A-Za-z0-9\-_]+$/, {
    message: 'sku may only contain letters, numbers, dashes and underscores',
  })
  sku: string;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  quantity?: number;

  @ApiPropertyOptional({ default: 5 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  lowStockThreshold?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  descriptionBN?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  imagePath?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  myBuyingPrice?: number;

  @ApiProperty({ example: 1290 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  price: number;

  @ApiPropertyOptional({
    description: 'Defaults to price when omitted',
    example: 990,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  discountedPrice?: number;

  @ApiPropertyOptional({ example: '2026-10-05T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  discountedPriceStartDate?: string;

  @ApiPropertyOptional({ example: '2026-11-05T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  discountedPriceEndDate?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({
    type: [SkuVariantPairDto],
    description: 'One or more attribute → attributeValue pairs',
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => SkuVariantPairDto)
  variants: SkuVariantPairDto[];
}

/**
 * After creation only price/discountedPrice/isActive/isDefault and the
 * image fields may be changed. Attribute/value pairs and the SKU code
 * itself are immutable.
 */
export class UpdateSkuDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  price?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  discountedPrice?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  /** Replaces the SKU image — pass a new url/path (from SKU upload) to swap + delete the old file. */
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  imagePath?: string;
}
