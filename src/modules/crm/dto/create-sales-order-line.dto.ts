import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsUUID, IsNumber, IsString, IsOptional, IsEnum, Min } from 'class-validator';
import { SalesDiscountType } from '@/common/enums/crm.enums';

export class CreateSalesOrderLineDto {
  @ApiProperty()
  @IsUUID()
  productId!: string;

  @ApiProperty({ example: 5 })
  @IsNumber()
  @Min(1)
  quantity!: number;

  @ApiProperty({ example: 100 })
  @IsNumber()
  @Min(0)
  unitPrice!: number;

  @ApiPropertyOptional({ enum: SalesDiscountType })
  @IsOptional()
  @IsEnum(SalesDiscountType)
  discountType?: 'percentage' | 'fixed';

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  discountValue?: number;

  @ApiPropertyOptional({ example: 15, description: 'Tax rate percentage' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  taxRate?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;
}
