import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsEnum, IsNumber, IsUUID, IsOptional, Min } from 'class-validator';
import { DownPaymentType } from '@/common/enums/pricelist.enums';

export class CreateDownPaymentDto {
  @ApiProperty({ description: 'Branch ID', format: 'uuid' })
  @IsNotEmpty()
  @IsUUID()
  branchId!: string;

  @ApiProperty({ description: 'Down payment type', enum: DownPaymentType })
  @IsNotEmpty()
  @IsEnum(DownPaymentType)
  type!: DownPaymentType;

  @ApiProperty({ description: 'Value (percentage or fixed amount)' })
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  value!: number;

  @ApiPropertyOptional({ description: 'Invoice ID to link', format: 'uuid' })
  @IsOptional()
  @IsUUID()
  invoiceId?: string;
}
