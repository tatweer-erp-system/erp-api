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
import { SalesDiscountType } from '@/common/enums/crm.enums';

export class CreateSalesOrderDto {
  @ApiProperty({ description: 'Partner (customer) ID' })
  @IsUUID()
  partnerId!: string;

  @ApiPropertyOptional({ description: 'Branch ID for sequence generation and scoping' })
  @IsOptional()
  @IsUUID()
  branchId?: string;

  @ApiPropertyOptional({ description: 'Currency ID — defaults to tenant base currency' })
  @IsOptional()
  @IsUUID()
  currencyId?: string;

  @ApiPropertyOptional({ description: 'Pricelist ID — overrides partner default' })
  @IsOptional()
  @IsUUID()
  pricelistId?: string;

  @ApiPropertyOptional({ description: 'Payment term ID' })
  @IsOptional()
  @IsUUID()
  paymentTermId?: string;

  @ApiPropertyOptional({ description: 'Salesperson (user) ID' })
  @IsOptional()
  @IsUUID()
  salespersonId?: string;

  @ApiPropertyOptional({ description: 'Fiscal position ID — overrides partner default' })
  @IsOptional()
  @IsUUID()
  fiscalPositionId?: string;

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
