import {
  IsString,
  IsUUID,
  IsArray,
  ValidateNested,
  IsOptional,
  IsEnum,
  IsNumber,
  ArrayMaxSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OrderType, PaymentMethod } from '@/common/enums/pos.enums';
import { MAX_SYNC_BATCH_SIZE } from '@/common/constants/pos.constants';

export class OfflinePaymentDto {
  @ApiProperty({ enum: PaymentMethod, description: 'Payment method' })
  @IsEnum(PaymentMethod)
  method!: PaymentMethod;

  @ApiProperty({ description: 'Payment amount', example: 100 })
  @IsNumber()
  amount!: number;

  @ApiPropertyOptional({ description: 'Payment reference' })
  @IsOptional()
  @IsString()
  reference?: string;
}

export class OfflineOrderItemDto {
  @ApiProperty({ description: 'Product ID' })
  @IsUUID()
  productId!: string;

  @ApiPropertyOptional({ description: 'Product variant ID' })
  @IsOptional()
  @IsUUID()
  productVariantId?: string;

  @ApiProperty({ description: 'Quantity', example: 2 })
  @IsNumber()
  quantity!: number;

  @ApiProperty({ description: 'Unit price', example: 25.0 })
  @IsNumber()
  unitPrice!: number;

  @ApiPropertyOptional({ description: 'Item-level discount amount' })
  @IsOptional()
  @IsNumber()
  discountAmount?: number;

  @ApiPropertyOptional({ description: 'Item notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class OfflineOrderDto {
  @ApiProperty({ description: 'Unique offline-generated order ID' })
  @IsUUID()
  offlineId!: string;

  @ApiProperty({ enum: OrderType, description: 'Order type' })
  @IsEnum(OrderType)
  orderType!: OrderType;

  @ApiPropertyOptional({ description: 'Table ID (for dine-in orders)' })
  @IsOptional()
  @IsUUID()
  tableId?: string;

  @ApiPropertyOptional({ description: 'Partner ID (customer)' })
  @IsOptional()
  @IsUUID()
  partnerId?: string;

  /** @deprecated Use partnerId instead */
  @ApiPropertyOptional({ description: 'Customer ID (deprecated — use partnerId)' })
  @IsOptional()
  @IsUUID()
  customerId?: string;

  @ApiProperty({ type: [OfflineOrderItemDto], description: 'Order items' })
  @ValidateNested({ each: true })
  @Type(() => OfflineOrderItemDto)
  @IsArray()
  items!: OfflineOrderItemDto[];

  @ApiProperty({ type: [OfflinePaymentDto], description: 'Payment entries' })
  @ValidateNested({ each: true })
  @Type(() => OfflinePaymentDto)
  @IsArray()
  payments!: OfflinePaymentDto[];

  @ApiProperty({ description: 'ISO timestamp when order was created offline' })
  @IsString()
  createdAt!: string;

  @ApiPropertyOptional({ description: 'Order-level discount amount' })
  @IsOptional()
  @IsNumber()
  discountAmount?: number;

  @ApiPropertyOptional({ description: 'Tip amount' })
  @IsOptional()
  @IsNumber()
  tipAmount?: number;

  @ApiPropertyOptional({ description: 'Order notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class SyncBatchDto {
  @ApiProperty({ description: 'POS session ID' })
  @IsUUID()
  sessionId!: string;

  @ApiProperty({ type: [OfflineOrderDto], description: 'Offline orders to sync' })
  @ValidateNested({ each: true })
  @Type(() => OfflineOrderDto)
  @IsArray()
  @ArrayMaxSize(MAX_SYNC_BATCH_SIZE)
  orders!: OfflineOrderDto[];
}
