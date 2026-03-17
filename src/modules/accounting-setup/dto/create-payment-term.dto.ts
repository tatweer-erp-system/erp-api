import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsEnum,
  IsOptional,
  IsNumber,
  IsInt,
  IsArray,
  ValidateNested,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PaymentTermLineType } from '@/common/enums/accounting-new.enums';

export class CreatePaymentTermLineDto {
  @ApiPropertyOptional({ default: 0, description: 'Display order' })
  @IsOptional()
  @IsInt()
  sequence?: number = 0;

  @ApiProperty({ enum: PaymentTermLineType, description: 'Line type' })
  @IsEnum(PaymentTermLineType)
  type!: PaymentTermLineType;

  @ApiPropertyOptional({ default: 0, description: 'Value (percentage or fixed amount)' })
  @IsOptional()
  @IsNumber()
  value?: number = 0;

  @ApiPropertyOptional({ default: 0, description: 'Number of days after invoice date' })
  @IsOptional()
  @IsInt()
  days?: number = 0;

  @ApiPropertyOptional({ description: 'Specific day of the month for payment' })
  @IsOptional()
  @IsInt()
  dayOfMonth?: number;
}

export class CreatePaymentTermDto {
  @ApiProperty({ description: 'Payment term name in English', example: 'Net 30' })
  @IsString()
  @MaxLength(255)
  nameEn!: string;

  @ApiProperty({ description: 'Payment term name in Arabic', example: 'صافي 30 يوم' })
  @IsString()
  @MaxLength(255)
  nameAr!: string;

  @ApiPropertyOptional({ description: 'Additional note' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;

  @ApiPropertyOptional({ type: [CreatePaymentTermLineDto], description: 'Payment schedule lines' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePaymentTermLineDto)
  lines?: CreatePaymentTermLineDto[];
}
