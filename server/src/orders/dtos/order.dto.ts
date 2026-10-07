import { IsIn, IsNumber, IsOptional, IsString } from 'class-validator';
import { OrderStatus, PaymentMethod } from '../../database/enums/enums';

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
