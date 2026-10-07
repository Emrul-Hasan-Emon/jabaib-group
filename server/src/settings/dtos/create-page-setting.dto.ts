import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreatePageSettingDto {
  @ApiProperty({ example: 'about_us' })
  @IsString()
  @MaxLength(100)
  key: string;

  @ApiProperty({ example: 'About Us' })
  @IsString()
  @MaxLength(250)
  title: string;

  @ApiPropertyOptional({ example: 'আমাদের সম্পর্কে' })
  @IsOptional()
  @IsString()
  @MaxLength(250)
  titleBN?: string;

  @ApiProperty({ example: '<h1>Jabaib</h1><p>Since 2020...</p>' })
  @IsString()
  content: string;

  @ApiPropertyOptional({ example: '<h1>জাবাইব</h1><p>২০২০ সাল থেকে...</p>' })
  @IsOptional()
  @IsString()
  contentBN?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
