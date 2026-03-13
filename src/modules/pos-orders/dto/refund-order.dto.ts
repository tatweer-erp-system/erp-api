import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { RefundType } from '@/common/enums/pos.enums';

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
}
