import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsEmail,
  IsEnum,
  IsUUID,
  IsNumber,
  IsBoolean,
  MaxLength,
  Min,
} from 'class-validator';
import { PartnerType } from '@/common/enums/partner.enums';

export class CreatePartnerDto {
  @ApiProperty({ description: 'Partner name in English' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  nameEn!: string;

  @ApiProperty({ description: 'Partner name in Arabic' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  nameAr!: string;

  @ApiProperty({ description: 'Partner type', enum: PartnerType })
  @IsNotEmpty()
  @IsEnum(PartnerType)
  type!: PartnerType;

  @ApiPropertyOptional({ description: 'Tax registration number' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  taxNumber?: string;

  @ApiPropertyOptional({ description: 'VAT registration number' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  vatNumber?: string;

  @ApiPropertyOptional({ description: 'Phone number' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string;

  @ApiPropertyOptional({ description: 'Mobile number' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  mobile?: string;

  @ApiPropertyOptional({ description: 'Email address' })
  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  email?: string;

  @ApiPropertyOptional({ description: 'Website URL' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  website?: string;

  @ApiPropertyOptional({ description: 'Street address' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  street?: string;

  @ApiPropertyOptional({ description: 'City' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @ApiPropertyOptional({ description: 'State / Province' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  state?: string;

  @ApiPropertyOptional({ description: 'Country', default: 'Saudi Arabia' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  country?: string;

  @ApiPropertyOptional({ description: 'ZIP / Postal code' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  zip?: string;

  @ApiPropertyOptional({ description: 'Credit limit', default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  creditLimit?: number;

  @ApiPropertyOptional({ description: 'Payment term ID', format: 'uuid' })
  @IsOptional()
  @IsUUID()
  paymentTermId?: string;

  @ApiPropertyOptional({ description: 'Pricelist ID', format: 'uuid' })
  @IsOptional()
  @IsUUID()
  pricelistId?: string;

  @ApiPropertyOptional({ description: 'Accounts receivable account ID', format: 'uuid' })
  @IsOptional()
  @IsUUID()
  arAccountId?: string;

  @ApiPropertyOptional({ description: 'Accounts payable account ID', format: 'uuid' })
  @IsOptional()
  @IsUUID()
  apAccountId?: string;

  @ApiPropertyOptional({ description: 'Fiscal position ID', format: 'uuid' })
  @IsOptional()
  @IsUUID()
  fiscalPositionId?: string;

  @ApiPropertyOptional({ description: 'Bank IBAN' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  bankIban?: string;

  @ApiPropertyOptional({ description: 'Bank name' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  bankName?: string;

  @ApiPropertyOptional({ description: 'Additional notes' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'Whether the partner is active', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
