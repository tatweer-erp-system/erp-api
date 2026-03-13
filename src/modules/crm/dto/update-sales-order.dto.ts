import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsUUID,
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  IsInt,
  IsArray,
  ValidateNested,
  ArrayMinSize,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreateSalesOrderLineDto } from './create-sales-order-line.dto';
import { SupplyType, TaxCategory, SalesDiscountType } from '@/common/enums/crm.enums';

/**
 * Update DTO for sales orders.
 * Note: invoiceType and transactionType cannot be changed after creation.
 */
export class UpdateSalesOrderDto {
  @ApiProperty({ description: 'Record version for optimistic locking' })
  @IsInt()
  @Min(0)
  version!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  contactId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  assignedTo?: string;

  @ApiPropertyOptional({ enum: SupplyType })
  @IsOptional()
  @IsEnum(SupplyType)
  supplyType?: string;

  @ApiPropertyOptional({ enum: TaxCategory })
  @IsOptional()
  @IsEnum(TaxCategory)
  taxCategory?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  taxExemptionCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  taxExemptionReason?: string;

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

  @ApiPropertyOptional({ type: [CreateSalesOrderLineDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateSalesOrderLineDto)
  @ArrayMinSize(1)
  lines?: CreateSalesOrderLineDto[];
}
