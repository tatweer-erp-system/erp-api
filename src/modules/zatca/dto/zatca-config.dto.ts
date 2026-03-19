import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum } from 'class-validator';
import { ZatcaEnvironment } from '@/common/enums/crm.enums';

export class SaveZatcaConfigDto {
  @ApiProperty({ description: 'VAT registration number' })
  @IsOptional()
  @IsString()
  zatcaVatNumber?: string;

  @ApiPropertyOptional({ description: 'Seller name in English' })
  @IsOptional()
  @IsString()
  zatcaSellerNameEn?: string;

  @ApiPropertyOptional({ description: 'Seller name in Arabic' })
  @IsOptional()
  @IsString()
  zatcaSellerNameAr?: string;

  @ApiPropertyOptional({ description: 'Street address in English' })
  @IsOptional()
  @IsString()
  zatcaStreetEn?: string;

  @ApiPropertyOptional({ description: 'Street address in Arabic' })
  @IsOptional()
  @IsString()
  zatcaStreetAr?: string;

  @ApiPropertyOptional({ description: 'Building number' })
  @IsOptional()
  @IsString()
  zatcaBuildingNumber?: string;

  @ApiPropertyOptional({ description: 'City name in English' })
  @IsOptional()
  @IsString()
  zatcaCityEn?: string;

  @ApiPropertyOptional({ description: 'City name in Arabic' })
  @IsOptional()
  @IsString()
  zatcaCityAr?: string;

  @ApiPropertyOptional({ description: 'Postal code' })
  @IsOptional()
  @IsString()
  zatcaPostalCode?: string;

  @ApiPropertyOptional({ description: 'District in English' })
  @IsOptional()
  @IsString()
  zatcaDistrictEn?: string;

  @ApiPropertyOptional({ description: 'District in Arabic' })
  @IsOptional()
  @IsString()
  zatcaDistrictAr?: string;

  @ApiPropertyOptional({ description: 'Country code (default SA)' })
  @IsOptional()
  @IsString()
  zatcaCountryCode?: string;

  @ApiPropertyOptional({ description: 'Commercial registration number' })
  @IsOptional()
  @IsString()
  zatcaCrNumber?: string;

  @ApiPropertyOptional({ description: 'ECDSA private key (PEM)' })
  @IsOptional()
  @IsString()
  zatcaPrivateKey?: string;

  @ApiPropertyOptional({ description: 'X.509 certificate (PEM)' })
  @IsOptional()
  @IsString()
  zatcaCertificate?: string;

  @ApiPropertyOptional({
    description: 'ZATCA environment',
    enum: ZatcaEnvironment,
  })
  @IsOptional()
  @IsEnum(ZatcaEnvironment)
  zatcaEnvironment?: ZatcaEnvironment;

  @ApiPropertyOptional({ description: 'ZATCA API secret' })
  @IsOptional()
  @IsString()
  zatcaApiSecret?: string;
}
