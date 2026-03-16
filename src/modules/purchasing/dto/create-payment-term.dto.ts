import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreatePaymentTermDto {
  @ApiProperty({ description: 'Payment term name in English' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  nameEn!: string;

  @ApiProperty({ description: 'Payment term name in Arabic' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  nameAr!: string;

  @ApiPropertyOptional({ description: 'Description in English' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  descriptionEn?: string;

  @ApiPropertyOptional({ description: 'Description in Arabic' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  descriptionAr?: string;

  @ApiProperty({ description: 'Number of days until payment is due' })
  @IsNotEmpty()
  @IsNumber()
  @IsInt()
  daysDue!: number;

  @ApiPropertyOptional({ description: 'Late payment penalty percentage' })
  @IsOptional()
  @IsNumber()
  penaltyPercentage?: number;

  @ApiPropertyOptional({ description: 'Whether the payment term is active', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
