import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsUUID,
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  IsArray,
  ValidateNested,
  ArrayMinSize,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreateSalesOrderLineDto } from './create-sales-order-line.dto';
import {
  ZatcaInvoiceType,
  ZatcaTransactionType,
  SupplyType,
  ZatcaTaxCategory,
  SalesDiscountType,
} from '@/common/enums/crm.enums';

export class CreateSalesOrderDto {
  @ApiProperty({ description: 'Contact (customer) ID' })
  @IsUUID()
  contactId!: string;

  @ApiPropertyOptional({ description: 'Branch ID for sequence generation and scoping' })
  @IsOptional()
  @IsUUID()
  branchId?: string;

  @ApiPropertyOptional({ description: 'Currency ID — defaults to tenant base currency' })
  @IsOptional()
  @IsUUID()
  currencyId?: string;

  @ApiPropertyOptional({
    enum: ZatcaInvoiceType,
    description: 'ZATCA invoice type — defaults to SIMPLIFIED',
  })
  @IsOptional()
  @IsEnum(ZatcaInvoiceType)
  invoiceType?: string;

  @ApiPropertyOptional({
    enum: ZatcaTransactionType,
    description: 'ZATCA transaction type — defaults to SALE',
  })
  @IsOptional()
  @IsEnum(ZatcaTransactionType)
  transactionType?: string;

  @ApiPropertyOptional({ enum: SupplyType, description: 'ZATCA supply type — defaults to GOODS' })
  @IsOptional()
  @IsEnum(SupplyType)
  supplyType?: string;

  @ApiPropertyOptional({
    enum: ZatcaTaxCategory,
    description: 'ZATCA tax category — defaults to S',
  })
  @IsOptional()
  @IsEnum(ZatcaTaxCategory)
  taxCategory?: string;

  @ApiPropertyOptional({ description: 'Tax exemption code for E/O categories' })
  @IsOptional()
  @IsString()
  taxExemptionCode?: string;

  @ApiPropertyOptional({ description: 'Tax exemption reason for E/O categories' })
  @IsOptional()
  @IsString()
  taxExemptionReason?: string;

  @ApiPropertyOptional({ description: 'Original invoice ID for credit/debit notes' })
  @IsOptional()
  @IsUUID()
  originalInvoiceId?: string;

  @ApiPropertyOptional({ description: 'Free-text notes' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ enum: SalesDiscountType, description: 'Order-level discount type' })
  @IsOptional()
  @IsEnum(SalesDiscountType)
  discountType?: string;

  @ApiPropertyOptional({ description: 'Order-level discount value' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  discountValue?: number;

  @ApiProperty({
    type: [CreateSalesOrderLineDto],
    description: 'Order lines — at least one required',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateSalesOrderLineDto)
  @ArrayMinSize(1)
  lines!: CreateSalesOrderLineDto[];
}
