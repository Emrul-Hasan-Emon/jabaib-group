import {
  IsIn,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';

export class PaymentCallbackDto {
  @IsNumber()
  orderId: number;

  @IsString()
  transactionId: string;

  @IsIn(['success', 'failed'])
  status: 'success' | 'failed';

  @IsOptional()
  @IsNumber()
  amount?: number;

  @IsOptional()
  @IsObject()
  raw?: Record<string, unknown>;
}
