import { IsIn, IsNumber, IsOptional, IsString } from 'class-validator';
import { OrderReturnStatus } from '../../database/enums/enums';

export class UpdateOrderReturnStatusDto {
  @IsIn(Object.values(OrderReturnStatus))
  status: string;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsNumber()
  refundAmount?: number;

  @IsOptional()
  @IsString()
  refundMethod?: string;
}
