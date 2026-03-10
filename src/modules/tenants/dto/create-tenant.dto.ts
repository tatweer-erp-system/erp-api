import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MinLength,
  MaxLength,
} from 'class-validator';

export class CreateTenantDto {
  @ApiProperty({ description: 'Tenant name in English', example: 'Acme Corp' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  name_en: string;

  @ApiProperty({ description: 'Tenant name in Arabic', example: 'شركة أكمي' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  name_ar: string;

  @ApiProperty({
    description: 'Unique tenant slug (lowercase, alphanumeric, hyphens)',
    example: 'acme-corp',
  })
  @IsNotEmpty()
  @IsString()
  @Matches(/^[a-z0-9-]+$/, {
    message: 'Slug must contain only lowercase letters, numbers, and hyphens',
  })
  @MaxLength(100)
  slug: string;

  @ApiProperty({ description: 'Admin user email', example: 'admin@acme.com' })
  @IsNotEmpty()
  @IsEmail()
  adminEmail: string;

  @ApiProperty({ description: 'Admin user password (min 8 characters)', example: 'SecureP@ss1' })
  @IsNotEmpty()
  @IsString()
  @MinLength(8)
  adminPassword: string;

  @ApiProperty({ description: 'Admin first name in English', example: 'John' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  adminFirstName_en: string;

  @ApiProperty({ description: 'Admin first name in Arabic', example: 'جون' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  adminFirstName_ar: string;

  @ApiProperty({ description: 'Admin last name in English', example: 'Doe' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  adminLastName_en: string;

  @ApiProperty({ description: 'Admin last name in Arabic', example: 'دو' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  adminLastName_ar: string;

  @ApiPropertyOptional({ description: 'Contact phone number', example: '+966500000000' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @ApiPropertyOptional({ description: 'Custom domain', example: 'erp.acme.com' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  domain?: string;

  @ApiPropertyOptional({ description: 'Subscription plan ID' })
  @IsOptional()
  @IsString()
  planId?: string;

  // Legacy compatibility getters used by TenantProvisionerService
  get name(): string {
    return this.name_en;
  }

  get adminFirstName(): string {
    return this.adminFirstName_en;
  }

  get adminLastName(): string {
    return this.adminLastName_en;
  }

  get plan(): string | undefined {
    return this.planId;
  }
}
