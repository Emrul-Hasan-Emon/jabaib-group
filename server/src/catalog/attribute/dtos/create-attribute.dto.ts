import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateAttributeValueDto } from './create-attribute-value.dto';

export class CreateAttributeDto {
  @ApiProperty()
  @IsString()
  @MaxLength(250)
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(250)
  nameBN?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(250)
  slug?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  descriptionBN?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    type: [CreateAttributeValueDto],
    description: 'Values to create along with the attribute',
  })
  @IsOptional()
  @Type(() => CreateAttributeValueDto)
  values?: CreateAttributeValueDto[];
}
