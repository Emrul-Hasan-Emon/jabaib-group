import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class AdminLoginDto {
  @ApiProperty({ example: 'admin@jabaib.com' })
  @IsString()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'Admin@12345' })
  @IsString()
  @MinLength(6)
  password: string;
}

export class UserLoginDto {
  /** Email or phone number — one of the two is required. */
  @ApiProperty({ example: 'customer@example.com', required: false })
  @IsString()
  @IsNotEmpty()
  emailOrPhone: string;

  @ApiProperty({ example: 'Secret@123' })
  @IsString()
  @MinLength(6)
  password: string;
}

export class RefreshTokenDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}

export class LogoutDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}

export class ChangePasswordDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  currentPassword: string;

  @ApiProperty({ minLength: 6 })
  @IsString()
  @MinLength(6)
  newPassword: string;
}
