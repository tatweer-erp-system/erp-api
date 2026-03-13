import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsObject, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { BilingualNameDto } from './create-currency.dto';

export class UpdateCurrencyDto {
  @ApiPropertyOptional({ type: BilingualNameDto, description: 'Bilingual currency name' })
  @IsOptional()
  @IsObject()
  name?: BilingualNameDto;

  @ApiPropertyOptional({ description: 'Currency symbol', example: '﷼' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  symbol?: string;

  @ApiPropertyOptional({ description: 'Is the currency active' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Number of decimal places' })
  @IsOptional()
  @IsInt()
  @Min(0)
  decimalPlaces?: number;
}
