import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsInt, IsArray, ValidateNested, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';
import { CreatePaymentTermLineDto } from './create-payment-term.dto';

export class UpdatePaymentTermDto {
  @ApiPropertyOptional({ description: 'Payment term name in English' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  nameEn?: string;

  @ApiPropertyOptional({ description: 'Payment term name in Arabic' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  nameAr?: string;

  @ApiPropertyOptional({ description: 'Additional note' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string | null;

  @ApiPropertyOptional({
    type: [CreatePaymentTermLineDto],
    description: 'Payment schedule lines — replaces all existing lines',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePaymentTermLineDto)
  lines?: CreatePaymentTermLineDto[];

  @ApiProperty({ description: 'Optimistic lock version' })
  @IsInt()
  version!: number;
}
