import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { DeliveryType, PaymentMethod } from '../../../database/enums/enums';

/** Either an addressId from the address book, or the fields inline. */
export class CheckoutDto {
  @ApiPropertyOptional({
    example: 3,
    description: 'Saved address id. Omit to pass the address inline.',
  })
  @IsOptional()
  @IsInt()
  addressId?: number;

  @ApiPropertyOptional({ example: 'Rafi Ahmed' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  recipientName?: string;

  @ApiPropertyOptional({ example: '01712345678' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @ApiPropertyOptional({ example: 'House 12, Road 5, Dhanmondi' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  address?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  divisionId?: number;

  @ApiPropertyOptional({ example: 240 })
  @IsOptional()
  @IsInt()
  districtId?: number;

  @ApiPropertyOptional({ example: '1205' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  zipCode?: string;

  @ApiProperty({ enum: DeliveryType, example: DeliveryType.INSIDE_DHAKA })
  @IsIn(Object.values(DeliveryType), {
    message: 'deliveryType must be inside_dhaka or outside_dhaka',
  })
  deliveryType: DeliveryType;

  @ApiPropertyOptional({ example: 'EID20' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  couponCode?: string;

  @ApiPropertyOptional({ example: 'Please call before delivery' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;

  @ApiProperty({
    enum: PaymentMethod,
    example: PaymentMethod.COD,
    description:
      'Cash on delivery, or bkash/nagad/card with a manual transaction reference.',
  })
  @IsIn(Object.values(PaymentMethod), {
    message: 'paymentMethod must be cod, bkash, nagad or card',
  })
  paymentMethod: PaymentMethod;

  @ApiPropertyOptional({
    example: '9ABC123XYZ',
    description:
      'Required for bkash/nagad/card — the reference from the payment.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  transactionId?: string;

  @ApiPropertyOptional({
    example: 2,
    description:
      'Configured payment gateway to pay with. Omit to use the built-in methods above (cod/bkash/nagad/card).',
  })
  @IsOptional()
  @IsInt()
  paymentGatewayId?: number;

  @ApiPropertyOptional({
    example: { txnId: 'TXN123456' },
    description:
      'What the customer submits for a manual gateway — { txnId } for MFS, or { accountName, accountNumber, bankName, branchName } for a bank transfer. Stored on Payment.metaData.',
  })
  @IsOptional()
  @IsObject()
  paymentMetaData?: Record<string, unknown>;
}

/** Same payload as checkout — preview and place must agree. */
export class PreviewCheckoutDto extends CheckoutDto {}

export class CancelOrderDto {
  @ApiPropertyOptional({ example: 'Ordered by mistake' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

export class ReturnItemDto {
  @ApiProperty({ example: 4 })
  @IsInt()
  orderItemId: number;

  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  quantity: number;

  @ApiPropertyOptional({ example: 'Wrong size' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

export class RequestReturnDto {
  @ApiProperty({ example: 'Fabric colour is different from the photo' })
  @IsString()
  @MaxLength(1000)
  reason: string;

  @ApiProperty({ type: [ReturnItemDto] })
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => ReturnItemDto)
  items: ReturnItemDto[];

  @ApiPropertyOptional({
    type: [String],
    description: 'Photo paths returned by POST user/order-return/upload-image.',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(6)
  @IsString({ each: true })
  media?: string[];
}
