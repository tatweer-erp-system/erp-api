import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

export class AddOrderItemDto {
  @ApiProperty({ description: 'Product ID' })
  @IsUUID()
  @IsNotEmpty()
  productId!: string;

  @ApiProperty({ description: 'Quantity', example: 1 })
  @IsNumber()
  @Min(0.001)
  quantity!: number;

  @ApiPropertyOptional({ description: 'Per-item discount amount', default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  discountAmount?: number;

  @ApiPropertyOptional({ description: 'Course name (appetizer, entree, dessert, beverages)' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  course?: string;

  @ApiPropertyOptional({ description: 'Item notes' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
