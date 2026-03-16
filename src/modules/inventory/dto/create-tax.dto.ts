import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { TaxScope, TaxType } from '@/common/enums/inventory.enums';

export class CreateTaxDto {
  @ApiProperty({ example: 'Standard VAT' })
  @IsString()
  @IsNotEmpty()
  nameEn!: string;

  @ApiProperty({ example: 'ضريبة القيمة المضافة' })
  @IsString()
  @IsNotEmpty()
  nameAr!: string;

  @ApiProperty({ enum: TaxType, example: TaxType.PERCENTAGE })
  @IsEnum(TaxType)
  type!: TaxType;

  @ApiProperty({ enum: TaxScope, example: TaxScope.BOTH })
  @IsEnum(TaxScope)
  scope!: TaxScope;

  @ApiProperty({
    example: 15,
    description: 'Rate (%) for percentage type, or fixed amount for fixed type',
  })
  @IsNumber()
  @Min(0)
  amount!: number;

  @ApiPropertyOptional({
    example: false,
    description: 'Is tax already included in the unit price?',
  })
  @IsOptional()
  @IsBoolean()
  includeInPrice?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
