import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Min,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { DeliveryType, OrderStatus } from '../../database/enums/enums';

export class UpdateOrderStatusDto {
  @IsIn(Object.values(OrderStatus))
  status: string;

  @IsOptional()
  @IsString()
  note?: string;
}

export class RecordPaymentDto {
  @IsOptional()
  @IsString()
  transactionId?: string;

  @IsOptional()
  @IsNumber()
  amount?: number;
}

export class UpdateOrderNoteDto {
  @IsString()
  note: string;
}

export class CreateOrderItemDto {
  @IsInt()
  productId: number;

  @IsInt()
  productSKUId: number;

  @IsInt()
  @Min(1)
  quantity: number;
}

/**
 * Admin-placed order: the admin picks the customer, items and address
 * directly — no cart, no coupon. Payment is resolved from `paymentGatewayId`
 * only (never a hardcoded method); omit it to use the seeded Cash on
 * Delivery gateway.
 */
export class CreateOrderDto {
  @IsInt()
  userId: number;

  @IsOptional()
  @IsInt()
  paymentGatewayId?: number;

  @IsOptional()
  @IsObject()
  paymentMetaData?: Record<string, unknown>;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items: CreateOrderItemDto[];

  @IsOptional()
  @IsInt()
  addressId?: number;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  recipientName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  address?: string;

  @IsOptional()
  @IsInt()
  divisionId?: number;

  @IsOptional()
  @IsInt()
  districtId?: number;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  zipCode?: string;

  @IsIn(Object.values(DeliveryType), {
    message: 'deliveryType must be inside_dhaka or outside_dhaka',
  })
  deliveryType: DeliveryType;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
