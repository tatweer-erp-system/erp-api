import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsUUID,
  IsString,
  IsOptional,
  IsIn,
  IsNumber,
  IsArray,
  ValidateNested,
  ArrayMinSize,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreateSalesOrderLineDto } from './create-sales-order-line.dto';

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

  @ApiProperty({ enum: ['standard', 'simplified'], description: 'ZATCA invoice type' })
  @IsString()
  @IsIn(['standard', 'simplified'])
  invoiceType!: string;

  @ApiProperty({
    enum: ['invoice', 'debit_note', 'credit_note'],
    description: 'ZATCA transaction type',
  })
  @IsString()
  @IsIn(['invoice', 'debit_note', 'credit_note'])
  transactionType!: string;

  @ApiProperty({ enum: ['goods', 'services', 'both'], description: 'ZATCA supply type' })
  @IsString()
  @IsIn(['goods', 'services', 'both'])
  supplyType!: string;

  @ApiProperty({ enum: ['S', 'Z', 'E', 'O'], description: 'ZATCA tax category' })
  @IsString()
  @IsIn(['S', 'Z', 'E', 'O'])
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

  @ApiPropertyOptional({ enum: ['percentage', 'fixed'] })
  @IsOptional()
  @IsIn(['percentage', 'fixed'])
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
