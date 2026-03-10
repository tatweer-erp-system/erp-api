import { ApiPropertyOptional } from '@nestjs/swagger';
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

/**
 * Update DTO for sales orders.
 * Note: invoiceType and transactionType cannot be changed after creation.
 */
export class UpdateSalesOrderDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  contactId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  assignedTo?: string;

  @ApiPropertyOptional({ enum: ['goods', 'services', 'both'] })
  @IsOptional()
  @IsIn(['goods', 'services', 'both'])
  supplyType?: string;

  @ApiPropertyOptional({ enum: ['S', 'Z', 'E', 'O'] })
  @IsOptional()
  @IsIn(['S', 'Z', 'E', 'O'])
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

  @ApiPropertyOptional({ enum: ['percentage', 'fixed'] })
  @IsOptional()
  @IsIn(['percentage', 'fixed'])
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
