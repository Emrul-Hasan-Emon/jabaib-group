import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateCountryDto {
  @ApiProperty({ example: 'Bangladesh' })
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({ example: 'বাংলাদেশ' })
  @IsOptional()
  @IsString()
  @MaxLength(250)
  nameBN?: string;

  @ApiPropertyOptional({ example: 'bangladesh' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  slug?: string;

  @ApiPropertyOptional({ example: 'BD' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  code?: string;

  @ApiPropertyOptional({ example: 'BDT' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  currency?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class CreateDivisionDto {
  @ApiProperty({ example: 'Dhaka' })
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({ example: 'ঢাকা' })
  @IsOptional()
  @IsString()
  @MaxLength(250)
  nameBN?: string;

  @ApiPropertyOptional({ example: 'dhaka' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  slug?: string;

  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  countryId: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class CreateDistrictDto {
  @ApiProperty({ example: 'Gulshan' })
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({ example: 'গুলশান' })
  @IsOptional()
  @IsString()
  @MaxLength(250)
  nameBN?: string;

  @ApiPropertyOptional({ example: 'gulshan' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  slug?: string;

  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  countryId: number;

  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  divisionId: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateCountryDto extends PartialType(CreateCountryDto) {}
export class UpdateDivisionDto extends PartialType(CreateDivisionDto) {}
export class UpdateDistrictDto extends PartialType(CreateDistrictDto) {}
