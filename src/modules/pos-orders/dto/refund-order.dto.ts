import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  IsArray,
  IsNumber,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { RefundType } from '@/common/enums/pos.enums';

export class RefundItemDto {
  @ApiProperty({ description: 'Order item ID to refund' })
  @IsNotEmpty()
  @IsString()
  orderItemId!: string;

  @ApiProperty({ description: 'Quantity to refund', minimum: 1 })
  @IsNumber()
  @Min(1)
  quantity!: number;
}

export class RefundOrderDto {
  @ApiProperty({ enum: RefundType, description: 'Refund type' })
  @IsEnum(RefundType)
  @IsNotEmpty()
  refundType!: RefundType;

  @ApiProperty({ description: 'Manager user ID who approved the refund' })
  @IsUUID()
  @IsNotEmpty()
  approvedBy!: string;

  @ApiPropertyOptional({ description: 'Refund reason' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;

  @ApiPropertyOptional({ description: 'Refund method', example: 'cash' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  refundMethod?: string;

  @ApiPropertyOptional({ description: 'Warehouse ID for stock restoration' })
  @IsOptional()
  @IsUUID()
  warehouseId?: string;

  @ApiPropertyOptional({
    description: 'Items to refund (required for partial refund, omit for full refund)',
    type: [RefundItemDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RefundItemDto)
  items?: RefundItemDto[];
}
