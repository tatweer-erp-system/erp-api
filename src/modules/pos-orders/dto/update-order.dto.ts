import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';
import { OrderType } from '@/common/enums/pos.enums';

export class UpdateOrderDto {
  @ApiProperty({ description: 'Record version for optimistic locking', example: 0 })
  @IsNotEmpty()
  @IsInt()
  version!: number;

  @ApiPropertyOptional({ enum: OrderType })
  @IsOptional()
  @IsEnum(OrderType)
  orderType?: OrderType;

  @ApiPropertyOptional({ description: 'Partner ID (customer)' })
  @IsOptional()
  @IsUUID()
  partnerId?: string | null;

  @ApiPropertyOptional({ description: 'Table ID' })
  @IsOptional()
  @IsUUID()
  tableId?: string | null;

  @ApiPropertyOptional({ description: 'Delivery address' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  deliveryAddress?: string | null;

  @ApiPropertyOptional({ description: 'Delivery fee' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  deliveryFee?: number;

  @ApiPropertyOptional({ description: 'Pricelist ID' })
  @IsOptional()
  @IsUUID()
  pricelistId?: string | null;
}
