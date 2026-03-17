import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  ArrayMinSize,
} from 'class-validator';

export class CreateTenantUserDto {
  @ApiProperty({ description: 'User email address', example: 'user@company.com' })
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @ApiProperty({ description: 'User password (min 8 characters)', example: 'SecureP@ss1' })
  @IsNotEmpty()
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({ description: 'First name (English)', example: 'Ahmed' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  firstNameEn: string;

  @ApiProperty({ description: 'First name (Arabic)', example: 'أحمد' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  firstNameAr: string;

  @ApiProperty({ description: 'Last name (English)', example: 'Al-Rashid' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  lastNameEn: string;

  @ApiProperty({ description: 'Last name (Arabic)', example: 'الراشد' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  lastNameAr: string;

  @ApiPropertyOptional({ description: 'Phone number', example: '+966500000000' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @ApiPropertyOptional({ description: 'Role IDs to assign', type: [String] })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  roleIds?: string[];

  @ApiPropertyOptional({ description: 'Whether user is active', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateTenantUserDto {
  @ApiPropertyOptional({ description: 'User email address', example: 'user@company.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ description: 'First name (English)', example: 'Ahmed' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  firstNameEn?: string;

  @ApiPropertyOptional({ description: 'First name (Arabic)', example: 'أحمد' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  firstNameAr?: string;

  @ApiPropertyOptional({ description: 'Last name (English)', example: 'Al-Rashid' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  lastNameEn?: string;

  @ApiPropertyOptional({ description: 'Last name (Arabic)', example: 'الراشد' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  lastNameAr?: string;

  @ApiPropertyOptional({ description: 'Phone number', example: '+966500000000' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @ApiPropertyOptional({ description: 'Role IDs to assign', type: [String] })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  roleIds?: string[];

  @ApiPropertyOptional({ description: 'Whether user is active' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class PermissionOverrideDto {
  @ApiProperty({ description: 'Permission key to grant', example: 'sales:export' })
  @IsNotEmpty()
  @IsString()
  permission: string;

  @ApiProperty({ description: 'Override type', enum: ['grant', 'revoke'] })
  @IsNotEmpty()
  @IsString()
  type: 'grant' | 'revoke';
}
