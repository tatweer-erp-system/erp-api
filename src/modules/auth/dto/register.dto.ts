import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'user@company.com', description: 'User email address' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    example: 'Password123!',
    description: 'User password (min 8 chars, must include uppercase, lowercase, and number)',
    minLength: 8,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message:
      'Password must contain at least one uppercase letter, one lowercase letter, and one number',
  })
  password: string;

  @ApiProperty({ example: 'Ahmed', description: 'First name (English)' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  firstNameEn: string;

  @ApiProperty({ example: 'أحمد', description: 'First name (Arabic)' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  firstNameAr: string;

  @ApiProperty({ example: 'Al-Rashid', description: 'Last name (English)' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  lastNameEn: string;

  @ApiProperty({ example: 'الراشد', description: 'Last name (Arabic)' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  lastNameAr: string;

  @ApiPropertyOptional({ example: '+966501234567', description: 'Phone number' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;
}
