import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsOptional,
  IsUUID,
  IsBoolean,
  IsEnum,
  IsArray,
  ValidateNested,
  Min,
  Max,
  IsNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ProductType, InvoicePolicy } from '@/common/enums/pos.enums';

export class ProductTaxItemDto {
  @ApiProperty({ description: 'Tax ID to link' })
  @IsUUID()
  taxId!: string;

  @ApiPropertyOptional({ description: 'Tax scope: sale or purchase', default: 'sale' })
  @IsOptional()
  @IsString()
  scope?: string;
}

export class CreateProductDto {
  @ApiProperty({ example: 'Office Chair' })
  @IsString()
  @IsNotEmpty()
  nameEn!: string;

  @ApiProperty({ example: 'كرسي مكتب' })
  @IsString()
  @IsNotEmpty()
  nameAr!: string;

  @ApiProperty({ example: 'SKU-001' })
  @IsString()
  @IsNotEmpty()
  sku!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  descriptionEn?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  descriptionAr?: string;

  @ApiProperty()
  @IsUUID()
  categoryId!: string;

  @ApiProperty({ example: 100 })
  @IsNumber()
  @Min(0)
  unitPrice!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  costPrice?: number;

  @ApiPropertyOptional({ example: 15 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  taxRate?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  barcode?: string;

  @ApiPropertyOptional({ example: 'pcs' })
  @IsOptional()
  @IsString()
  unit?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  minStockLevel?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxStockLevel?: number;

  @ApiPropertyOptional({ enum: ProductType, default: ProductType.STORABLE })
  @IsOptional()
  @IsEnum(ProductType)
  productType?: ProductType;

  @ApiPropertyOptional({ enum: InvoicePolicy, default: InvoicePolicy.ORDERED })
  @IsOptional()
  @IsEnum(InvoicePolicy)
  invoicePolicy?: InvoicePolicy;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  canBeSold?: boolean;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  canBePurchased?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  hasVariants?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  hasSerialTracking?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  hasLotTracking?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  hasExpiryDate?: boolean;

  @ApiPropertyOptional({ description: 'Brand UUID' })
  @IsOptional()
  @IsUUID()
  brandId?: string;

  @ApiPropertyOptional({ description: 'Purchase Unit of Measure UUID' })
  @IsOptional()
  @IsUUID()
  purchaseUomId?: string;

  @ApiPropertyOptional({ description: 'Income GL account override' })
  @IsOptional()
  @IsUUID()
  incomeAccountId?: string;

  @ApiPropertyOptional({ description: 'COGS GL account override' })
  @IsOptional()
  @IsUUID()
  cogsAccountId?: string;

  @ApiPropertyOptional({ description: 'Inventory GL account override' })
  @IsOptional()
  @IsUUID()
  inventoryAccountId?: string;

  @ApiPropertyOptional({ description: 'Stock Input GL account override' })
  @IsOptional()
  @IsUUID()
  stockInputAccountId?: string;

  @ApiPropertyOptional({ description: 'Stock Output GL account override' })
  @IsOptional()
  @IsUUID()
  stockOutputAccountId?: string;

  @ApiPropertyOptional({ description: 'Product taxes to assign', type: [ProductTaxItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductTaxItemDto)
  taxes?: ProductTaxItemDto[];
}
