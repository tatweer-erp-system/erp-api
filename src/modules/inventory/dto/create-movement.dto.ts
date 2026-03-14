import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsUUID, IsNumber, IsString, IsOptional, IsEnum, IsDateString } from 'class-validator';
import { StockMovementType, StockReferenceType } from '@/common/enums/inventory.enums';

export class CreateMovementDto {
  @ApiProperty()
  @IsUUID()
  productId!: string;

  @ApiProperty()
  @IsUUID()
  warehouseId!: string;

  @ApiProperty({ enum: StockMovementType })
  @IsEnum(StockMovementType)
  movementType!: StockMovementType;

  @ApiProperty({ description: 'Signed quantity (positive = in, negative = out)' })
  @IsNumber()
  quantity!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  unitCost?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  referenceId?: string;

  @ApiPropertyOptional({ enum: StockReferenceType })
  @IsOptional()
  @IsEnum(StockReferenceType)
  referenceType?: StockReferenceType;

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

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  branchId?: string;
}
