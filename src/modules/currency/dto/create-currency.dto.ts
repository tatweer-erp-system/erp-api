import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Length,
  MaxLength,
  Min,
} from 'class-validator';

export class BilingualNameDto {
  @ApiProperty({ description: 'Name in English' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  en!: string;

  @ApiProperty({ description: 'Name in Arabic' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  ar!: string;
}

export class CreateCurrencyDto {
  @ApiProperty({ description: 'ISO 4217 currency code (e.g. SAR, USD)', example: 'SAR' })
  @IsString()
  @IsNotEmpty()
  @Length(3, 3)
  code!: string;

  @ApiProperty({ type: BilingualNameDto, description: 'Bilingual currency name' })
  @IsObject()
  name!: BilingualNameDto;

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
