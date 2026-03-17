import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsDateString,
  IsOptional,
  IsUUID,
  IsString,
  IsNumber,
  IsArray,
  ValidateNested,
  ArrayMinSize,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { InvoiceTypeNew } from '@/common/enums/invoice.enums';
import { CreateInvoiceLineDto } from './create-invoice-line.dto';

export class CreateInvoiceDto {
  @ApiProperty({ description: 'Branch ID' })
  @IsUUID()
  branchId!: string;

  @ApiProperty({ description: 'Partner (customer/vendor) ID' })
  @IsUUID()
  partnerId!: string;

  @ApiProperty({ enum: InvoiceTypeNew, description: 'Invoice type' })
  @IsEnum(InvoiceTypeNew)
  invoiceType!: InvoiceTypeNew;

  @ApiProperty({ description: 'Invoice date', example: '2026-03-17' })
  @IsDateString()
  invoiceDate!: string;

  @ApiPropertyOptional({ description: 'Due date', example: '2026-04-17' })
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiPropertyOptional({ description: 'Payment term ID' })
  @IsOptional()
  @IsUUID()
  paymentTermId?: string;

  @ApiPropertyOptional({ description: 'Linked sales order ID' })
  @IsOptional()
  @IsUUID()
  saleOrderId?: string;

  @ApiPropertyOptional({ description: 'Linked purchase order ID' })
  @IsOptional()
  @IsUUID()
  purchaseOrderId?: string;

  @ApiPropertyOptional({ description: 'Currency ID' })
  @IsOptional()
  @IsUUID()
  currencyId?: string;

  @ApiPropertyOptional({ description: 'Exchange rate to base currency', default: 1 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 6 })
  @Min(0.000001)
  exchangeRate?: number;

  @ApiPropertyOptional({ description: 'External reference' })
  @IsOptional()
  @IsString()
  reference?: string;

  @ApiPropertyOptional({ description: 'Internal notes / narration' })
  @IsOptional()
  @IsString()
  narration?: string;

  @ApiPropertyOptional({ description: 'Fiscal position ID' })
  @IsOptional()
  @IsUUID()
  fiscalPositionId?: string;

  @ApiPropertyOptional({ description: 'Journal ID' })
  @IsOptional()
  @IsUUID()
  journalId?: string;

  @ApiProperty({ description: 'Invoice lines', type: [CreateInvoiceLineDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateInvoiceLineDto)
  lines!: CreateInvoiceLineDto[];
}
