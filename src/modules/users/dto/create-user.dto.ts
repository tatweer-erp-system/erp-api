import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  ArrayMinSize,
} from 'class-validator';

export class CreateUserDto {
  @ApiProperty({ description: 'User email address', example: 'user@company.com' })
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @ApiProperty({ description: 'User password (min 8 characters)', example: 'SecureP@ss1' })
  @IsNotEmpty()
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({ description: 'First name in English', example: 'John' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  firstName_en: string;

  @ApiProperty({ description: 'First name in Arabic', example: 'جون' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  firstName_ar: string;

  @ApiProperty({ description: 'Last name in English', example: 'Doe' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  lastName_en: string;

  @ApiProperty({ description: 'Last name in Arabic', example: 'دو' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  lastName_ar: string;

  @ApiPropertyOptional({ description: 'Phone number', example: '+966500000000' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @ApiProperty({ description: 'Role IDs to assign (required)', type: [String] })
  @IsNotEmpty()
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  roleIds: string[];
}
