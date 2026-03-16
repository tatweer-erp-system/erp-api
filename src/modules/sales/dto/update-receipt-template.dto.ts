import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsNumber, IsInt, MaxLength, Min } from 'class-validator';

export class UpdateReceiptTemplateDto {
  @ApiProperty({ description: 'Record version for optimistic locking' })
  @IsInt()
  @Min(0)
  version!: number;

  @ApiPropertyOptional({ description: 'English name' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  nameEn?: string;

  @ApiPropertyOptional({ description: 'Arabic name' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  nameAr?: string;

  @ApiPropertyOptional({ description: 'Header text in English' })
  @IsOptional()
  @IsString()
  headerTextEn?: string;

  @ApiPropertyOptional({ description: 'Header text in Arabic' })
  @IsOptional()
  @IsString()
  headerTextAr?: string;

  @ApiPropertyOptional({ description: 'Footer text in English' })
  @IsOptional()
  @IsString()
  footerTextEn?: string;

  @ApiPropertyOptional({ description: 'Footer text in Arabic' })
  @IsOptional()
  @IsString()
  footerTextAr?: string;

  @ApiPropertyOptional({ description: 'Whether to show logo on receipt' })
  @IsOptional()
  @IsBoolean()
  showLogo?: boolean;

  @ApiPropertyOptional({ description: 'Whether to show tax details on receipt' })
  @IsOptional()
  @IsBoolean()
  showTaxDetails?: boolean;

  @ApiPropertyOptional({ description: 'Whether to show barcode on receipt' })
  @IsOptional()
  @IsBoolean()
  showBarcode?: boolean;

  @ApiPropertyOptional({ description: 'Number of copies to print' })
  @IsOptional()
  @IsNumber()
  @IsInt()
  copies?: number;

  @ApiPropertyOptional({ description: 'Whether this is the default template' })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @ApiPropertyOptional({ description: 'Whether this template is active' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
