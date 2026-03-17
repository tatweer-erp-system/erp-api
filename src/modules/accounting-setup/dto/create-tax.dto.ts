import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsEnum,
  IsBoolean,
  IsOptional,
  IsUUID,
  IsNumber,
  MaxLength,
} from 'class-validator';
import { TaxType, TaxScope } from '@/common/enums/accounting-new.enums';

export class CreateTaxDto {
  @ApiProperty({ description: 'Tax name in English', example: 'VAT 15%' })
  @IsString()
  @MaxLength(255)
  nameEn!: string;

  @ApiProperty({ description: 'Tax name in Arabic', example: 'ضريبة القيمة المضافة 15%' })
  @IsString()
  @MaxLength(255)
  nameAr!: string;

  @ApiPropertyOptional({ enum: TaxType, default: TaxType.PERCENTAGE })
  @IsOptional()
  @IsEnum(TaxType)
  type?: TaxType = TaxType.PERCENTAGE;

  @ApiPropertyOptional({ example: 15.0, description: 'Tax amount or percentage' })
  @IsOptional()
  @IsNumber()
  amount?: number = 15.0;

  @ApiPropertyOptional({ enum: TaxScope, default: TaxScope.BOTH })
  @IsOptional()
  @IsEnum(TaxScope)
  scope?: TaxScope = TaxScope.BOTH;

  @ApiPropertyOptional({ default: false, description: 'Whether tax is included in the price' })
  @IsOptional()
  @IsBoolean()
  includeInPrice?: boolean = false;

  @ApiPropertyOptional({ description: 'Tax group ID' })
  @IsOptional()
  @IsUUID()
  taxGroupId?: string;

  @ApiPropertyOptional({ description: 'Sale account ID for tax posting' })
  @IsOptional()
  @IsUUID()
  saleAccountId?: string;

  @ApiPropertyOptional({ description: 'Purchase account ID for tax posting' })
  @IsOptional()
  @IsUUID()
  purchaseAccountId?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;
}
