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
  InvoiceType,
  TransactionType,
  SupplyType,
  TaxCategory,
  SalesDiscountType,
} from '@/common/enums/crm.enums';

export class CreateSalesOrderDto {
  @ApiProperty()
  @IsUUID()
  contactId!: string;

  @ApiPropertyOptional({ description: 'Branch ID for sequence generation' })
  @IsOptional()
  @IsUUID()
  branchId?: string;

  @ApiPropertyOptional({ description: 'Assigned user ID' })
  @IsOptional()
  @IsUUID()
  assignedTo?: string;

  // ── ZATCA classification fields ──

  @ApiProperty({ enum: InvoiceType, description: 'ZATCA invoice type' })
  @IsString()
  @IsEnum(InvoiceType)
  invoiceType!: string;

  @ApiProperty({
    enum: TransactionType,
    description: 'ZATCA transaction type',
  })
  @IsString()
  @IsEnum(TransactionType)
  transactionType!: string;

  @ApiProperty({ enum: SupplyType, description: 'ZATCA supply type' })
  @IsString()
  @IsEnum(SupplyType)
  supplyType!: string;

  @ApiProperty({ enum: TaxCategory, description: 'ZATCA tax category' })
  @IsString()
  @IsEnum(TaxCategory)
  taxCategory!: string;

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

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ enum: SalesDiscountType })
  @IsOptional()
  @IsEnum(SalesDiscountType)
  discountType?: 'percentage' | 'fixed';

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  discountValue?: number;

  @ApiProperty({ type: [CreateSalesOrderLineDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateSalesOrderLineDto)
  @ArrayMinSize(1)
  lines!: CreateSalesOrderLineDto[];
}
