import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { AddressType } from '../../../database/enums/enums';

export class CreateAddressDto {
  @ApiProperty({ example: 'Rafi Ahmed' })
  @IsString()
  @IsNotEmpty({ message: 'Recipient name is required' })
  recipientName: string;

  @ApiProperty({ example: '01712345678' })
  @IsString()
  @IsNotEmpty({ message: 'Phone is required' })
  phone: string;

  @ApiProperty({ example: 'House 12, Road 5, Dhanmondi' })
  @IsString()
  @IsNotEmpty({ message: 'Address is required' })
  address: string;

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

  @ApiPropertyOptional({ enum: AddressType, default: AddressType.SHIPPING })
  @IsOptional()
  @IsIn(Object.values(AddressType))
  type?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

export class UpdateAddressDto {
  @ApiPropertyOptional({ example: 'Rafi Ahmed' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  recipientName?: string;

  @ApiPropertyOptional({ example: '01712345678' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  phone?: string;

  @ApiPropertyOptional({ example: 'House 12, Road 5, Dhanmondi' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
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

  @ApiPropertyOptional({ enum: AddressType })
  @IsOptional()
  @IsIn(Object.values(AddressType))
  type?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
