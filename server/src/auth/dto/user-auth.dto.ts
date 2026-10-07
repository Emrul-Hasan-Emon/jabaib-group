import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

/** Customer self-registration — phone OR email is required, not both. */
export class RegisterUserDto {
  @ApiProperty({ example: 'Rafi Ahmed' })
  @IsString()
  @IsNotEmpty({ message: 'Name is required' })
  name: string;

  @ApiProperty({ example: 'customer@example.com', required: false })
  @IsEmail()
  @IsOptional()
  email?: string;

  /** Primary identifier in Bangladesh — keep every user reachable by phone. */
  @ApiProperty({ example: '01712345678', required: false })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiProperty({ example: 'Secret@123', minLength: 6 })
  @IsString()
  @MinLength(6)
  password: string;
}

/** Customer updates their own profile (name / phone). */
export class UpdateProfileDto {
  @ApiProperty({ example: 'Rafi Ahmed', required: false })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ example: '01812345678', required: false })
  @IsString()
  @IsOptional()
  phone?: string;
}
