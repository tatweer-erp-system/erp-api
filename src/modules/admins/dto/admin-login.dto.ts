import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class AdminLoginDto {
  @ApiProperty({ example: 'admin@platform.com', description: 'Admin email address' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'SecurePass123!', description: 'Admin password', minLength: 8 })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  password: string;
}
