import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsEnum,
  IsBoolean,
  IsOptional,
  IsUUID,
  IsNumber,
  IsInt,
  MaxLength,
} from 'class-validator';
import { TaxType, TaxScope } from '@/common/enums/accounting-new.enums';

export class UpdateTaxDto {
  @ApiPropertyOptional({ description: 'Tax name in English' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  nameEn?: string;

  @ApiPropertyOptional({ description: 'Tax name in Arabic' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  nameAr?: string;

  @ApiPropertyOptional({ enum: TaxType })
  @IsOptional()
  @IsEnum(TaxType)
  type?: TaxType;

  @ApiPropertyOptional({ description: 'Tax amount or percentage' })
  @IsOptional()
  @IsNumber()
  amount?: number;

  @ApiPropertyOptional({ enum: TaxScope })
  @IsOptional()
  @IsEnum(TaxScope)
  scope?: TaxScope;

  @ApiPropertyOptional({ description: 'Whether tax is included in the price' })
  @IsOptional()
  @IsBoolean()
  includeInPrice?: boolean;

  @ApiPropertyOptional({ description: 'Tax group ID' })
  @IsOptional()
  @IsUUID()
  taxGroupId?: string | null;

  @ApiPropertyOptional({ description: 'Sale account ID for tax posting' })
  @IsOptional()
  @IsUUID()
  saleAccountId?: string | null;

  @ApiPropertyOptional({ description: 'Purchase account ID for tax posting' })
  @IsOptional()
  @IsUUID()
  purchaseAccountId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({ description: 'Optimistic lock version' })
  @IsInt()
  version!: number;
}
