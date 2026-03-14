import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateCurrencyDto {
  @ApiProperty({ description: 'ISO 4217 currency code (e.g. SAR, USD)', example: 'SAR' })
  @IsString()
  @IsNotEmpty()
  @Length(3, 3)
  code!: string;

  @ApiProperty({ description: 'Currency name in English', example: 'Saudi Riyal' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  nameEn!: string;

  @ApiProperty({ description: 'Currency name in Arabic', example: 'ريال سعودي' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  nameAr!: string;

  @ApiProperty({ description: 'Currency symbol (e.g. ﷼, $)', example: '﷼' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(10)
  symbol!: string;

  @ApiPropertyOptional({
    description: 'Mark this as the base (functional) currency',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isBase?: boolean;

  @ApiPropertyOptional({ description: 'Is the currency active', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Number of decimal places', default: 2 })
  @IsOptional()
  @IsInt()
  @Min(0)
  decimalPlaces?: number;
}
