import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

/** Header carrying the anonymous browser's cart session id. */
export const CART_SESSION_HEADER = 'x-cart-session';

export class AddCartItemDto {
  @ApiProperty({ example: 8 })
  @IsInt()
  productId: number;

  @ApiPropertyOptional({
    example: 12,
    description:
      'Specific SKU (size/colour). Omit to let the server pick the cheapest in-stock active SKU.',
  })
  @IsOptional()
  @IsInt()
  productSKUId?: number;

  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(99)
  quantity?: number;
}

export class UpdateCartItemDto {
  @ApiProperty({ example: 2 })
  @IsInt()
  @Min(1)
  @Max(99)
  quantity: number;
}

export class MergeCartDto {
  @ApiPropertyOptional({
    example: '2f1c8f0e-6c1f-4a1a-9a2a-9a0f1c8f0e6c',
    description:
      'Guest cart session id to merge into the signed-in cart. Falls back to the x-cart-session header.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  sessionId?: string;
}
