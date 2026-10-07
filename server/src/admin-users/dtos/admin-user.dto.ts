import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { AdminUserRoleEnum } from '../../database/enums/user-type.enum';

export class CreateAdminUserDto {
  @ApiProperty({ example: 'Rahim Admin' })
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiProperty({ example: 'rahim@jabaib.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Admin@12345' })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({ enum: AdminUserRoleEnum })
  @IsIn(Object.values(AdminUserRoleEnum))
  role: string;

  @ApiPropertyOptional({ example: '/uploads/admin/rahim.jpg' })
  @IsOptional()
  @IsString()
  @MaxLength(250)
  imageUrl?: string;

  @ApiPropertyOptional({ example: '/uploads/admin/rahim.jpg' })
  @IsOptional()
  @IsString()
  @MaxLength(250)
  imagePath?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateAdminUserDto {
  @ApiPropertyOptional({ example: 'Rahim Admin' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ example: 'super_admin' })
  @IsOptional()
  @IsIn(Object.values(AdminUserRoleEnum))
  role?: string;

  @ApiPropertyOptional({ description: 'Set a new password' })
  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string;

  @ApiPropertyOptional({ example: '/uploads/admin/rahim.jpg' })
  @IsOptional()
  @IsString()
  @MaxLength(250)
  imageUrl?: string;

  @ApiPropertyOptional({ example: '/uploads/admin/rahim.jpg' })
  @IsOptional()
  @IsString()
  @MaxLength(250)
  imagePath?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
