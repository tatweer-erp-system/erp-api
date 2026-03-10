import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  IsDateString,
  IsArray,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreatePurchaseOrderLineDto } from './create-purchase-order-line.dto';

export class CreatePurchaseOrderDto {
  @ApiProperty({ description: 'Vendor ID', format: 'uuid' })
  @IsNotEmpty()
  @IsUUID()
  vendorId!: string;

  @ApiPropertyOptional({ description: 'Expected delivery date (ISO format)' })
  @IsOptional()
  @IsDateString()
  expectedDeliveryDate?: string;

  @ApiPropertyOptional({ description: 'Additional notes' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'Shipping address' })
  @IsOptional()
  @IsString()
  shippingAddress?: string;

  @ApiProperty({ description: 'Order line items', type: [CreatePurchaseOrderLineDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreatePurchaseOrderLineDto)
  lines!: CreatePurchaseOrderLineDto[];
}
