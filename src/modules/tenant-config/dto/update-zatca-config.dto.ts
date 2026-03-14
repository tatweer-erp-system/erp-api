import { IsOptional, IsString, IsIn } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateZatcaConfigDto {
  @ApiPropertyOptional({ description: 'ZATCA environment', enum: ['sandbox', 'production'] })
  @IsOptional()
  @IsIn(['sandbox', 'production'])
  zatcaEnvironment?: string;

  @ApiPropertyOptional({ description: 'VAT registration number' })
  @IsOptional()
  @IsString()
  vatNumber?: string;

  @ApiPropertyOptional({ description: 'Commercial registration number' })
  @IsOptional()
  @IsString()
  crNumber?: string;

  @ApiPropertyOptional({ description: 'Seller name in English' })
  @IsOptional()
  @IsString()
  sellerNameEn?: string;

  @ApiPropertyOptional({ description: 'Seller name in Arabic' })
  @IsOptional()
  @IsString()
  sellerNameAr?: string;

  @ApiPropertyOptional({ description: 'Seller city' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ description: 'Seller district' })
  @IsOptional()
  @IsString()
  district?: string;

  @ApiPropertyOptional({ description: 'Seller street' })
  @IsOptional()
  @IsString()
  street?: string;

  @ApiPropertyOptional({ description: 'Building number' })
  @IsOptional()
  @IsString()
  buildingNo?: string;

  @ApiPropertyOptional({ description: 'Postal code' })
  @IsOptional()
  @IsString()
  postalCode?: string;

  @ApiPropertyOptional({ description: 'ZATCA CSID token' })
  @IsOptional()
  @IsString()
  csid?: string;

  @ApiPropertyOptional({ description: 'ZATCA private key (PEM)' })
  @IsOptional()
  @IsString()
  privateKey?: string;

  @ApiPropertyOptional({ description: 'ZATCA certificate (PEM)' })
  @IsOptional()
  @IsString()
  certificate?: string;
}
