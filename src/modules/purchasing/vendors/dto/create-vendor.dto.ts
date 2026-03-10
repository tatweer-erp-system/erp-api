import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsEmail, MaxLength } from 'class-validator';

export class CreateVendorDto {
  @ApiProperty({ description: 'Vendor name in English' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  name_en!: string;

  @ApiProperty({ description: 'Vendor name in Arabic' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  name_ar!: string;

  @ApiPropertyOptional({ description: 'Vendor email address' })
  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  email?: string;

  @ApiPropertyOptional({ description: 'Vendor phone number' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @ApiPropertyOptional({ description: 'Vendor address' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ description: 'City' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @ApiPropertyOptional({ description: 'Country' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  country?: string;

  @ApiPropertyOptional({ description: 'VAT / tax number' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  vatNumber?: string;

  @ApiPropertyOptional({ description: 'Contact person name' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  contactPerson?: string;

  @ApiPropertyOptional({ description: 'Payment terms' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  paymentTerms?: string;

  @ApiPropertyOptional({ description: 'Additional notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}
