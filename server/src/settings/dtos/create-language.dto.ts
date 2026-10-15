import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateLanguageDto {
  @ApiProperty({ example: 'English' })
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiProperty({ example: 'en' })
  @IsString()
  @MaxLength(10)
  code: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
