import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsUUID, IsString, IsOptional, IsEnum, IsNumber, IsInt, Min } from 'class-validator';
import { SupplyType, ZatcaTaxCategory, SalesDiscountType } from '@/common/enums/crm.enums';

/**
 * Update DTO for sales orders (draft only).
 * invoiceType and transactionType cannot be changed after creation.
 */
export class UpdateSalesOrderDto {
  @ApiProperty({ description: 'Record version for optimistic locking' })
  @IsInt()
  @Min(0)
  version!: number;

  @ApiPropertyOptional({ description: 'Contact (customer) ID' })
  @IsOptional()
  @IsUUID()
  contactId?: string;

  @ApiPropertyOptional({ enum: SupplyType })
  @IsOptional()
  @IsEnum(SupplyType)
  supplyType?: string;

  @ApiPropertyOptional({ enum: ZatcaTaxCategory })
  @IsOptional()
  @IsEnum(ZatcaTaxCategory)
  taxCategory?: string;

  @ApiPropertyOptional({ description: 'Tax exemption code' })
  @IsOptional()
  @IsString()
  taxExemptionCode?: string;

  @ApiPropertyOptional({ description: 'Tax exemption reason' })
  @IsOptional()
  @IsString()
  taxExemptionReason?: string;

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
}
