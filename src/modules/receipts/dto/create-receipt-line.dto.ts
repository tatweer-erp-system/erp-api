import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsUUID, IsNumber, IsOptional, IsString, IsDateString, Min } from 'class-validator';

export class CreateReceiptLineDto {
  @ApiProperty()
  @IsUUID()
  productId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  purchaseOrderLineId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  productVariantId?: string;

  @ApiProperty({ description: 'Demanded quantity' })
  @IsNumber()
  @Min(0.0001)
  qtyDemand!: number;

  @ApiPropertyOptional({ description: 'Done quantity', default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  qtyDone?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  unitOfMeasureId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  locationId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  lotNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  serialNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  expiryDate?: string;

  @ApiPropertyOptional({ description: 'Unit cost for receiving', default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  unitCost?: number;
}
