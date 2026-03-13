import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsUUID, IsNumber, IsString, IsOptional, IsEnum, Min } from 'class-validator';
import { StockMovementType, StockReferenceType } from '@/common/enums/inventory.enums';

export class CreateStockMovementDto {
  @ApiProperty({ enum: StockMovementType })
  @IsEnum(StockMovementType)
  type!: StockMovementType;

  @ApiProperty()
  @IsUUID()
  productId!: string;

  @ApiProperty()
  @IsUUID()
  warehouseId!: string;

  @ApiProperty()
  @IsNumber()
  @Min(1)
  quantity!: number;

  @ApiPropertyOptional({ description: 'Target warehouse for transfers' })
  @IsOptional()
  @IsUUID()
  toWarehouseId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional({ enum: StockReferenceType })
  @IsOptional()
  @IsEnum(StockReferenceType)
  referenceType?: StockReferenceType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  referenceId?: string;
}
