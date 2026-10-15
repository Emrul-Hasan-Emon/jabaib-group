import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

/**
 * Customer-submitted review. Moderation is deferred to the admin panel
 * (isApproved=false until an admin approves). `orderId` is attached during
 * checkout (Phase 10) so a "verified purchase" badge can light up.
 */
export class CreateUserReviewDto {
  @ApiProperty({ example: 8, description: 'Published product id' })
  @IsInt()
  productId: number;

  @ApiProperty({ example: 5, minimum: 1, maximum: 5 })
  @IsInt()
  @Min(1, { message: 'Rating must be between 1 and 5' })
  @Max(5, { message: 'Rating must be between 1 and 5' })
  rating: number;

  @ApiPropertyOptional({
    example: 'Great quality fabric, true to size. Highly recommended!',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000, { message: 'Review comment must be under 2000 characters' })
  comment?: string;

  @ApiPropertyOptional({ type: [String], description: 'Optional image urls' })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(6, { message: 'At most 6 review images are allowed' })
  @IsString({ each: true })
  images?: string[];
}
