import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { OrderType } from '@/common/enums/pos.enums';

export class CreateOrderDto {
  @ApiPropertyOptional({ enum: OrderType, default: OrderType.TAKEAWAY })
  @IsOptional()
  @IsEnum(OrderType)
  orderType?: OrderType;

  @ApiPropertyOptional({ description: 'Customer ID for the order' })
  @IsOptional()
  @IsUUID()
  customerId?: string;

  @ApiPropertyOptional({ description: 'Table ID for dine-in orders' })
  @IsOptional()
  @IsUUID()
  tableId?: string;

  @ApiPropertyOptional({ description: 'Delivery address for delivery orders' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  deliveryAddress?: string;

  @ApiPropertyOptional({ description: 'Pricelist ID to apply' })
  @IsOptional()
  @IsUUID()
  pricelistId?: string;
}
