import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsUUID,
  IsInt,
  Min,
} from 'class-validator';
import { ProductType, InvoicePolicy } from '@/common/enums/inventory.enums';

export class CreateProductDto {
  @ApiProperty() @IsString() @IsNotEmpty() nameEn: string;
  @ApiProperty() @IsString() @IsNotEmpty() nameAr: string;
  @ApiPropertyOptional() @IsString() @IsOptional() reference?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() barcode?: string;
  @ApiProperty({ enum: ProductType }) @IsEnum(ProductType) type: ProductType;
  @ApiPropertyOptional() @IsUUID() @IsOptional() categoryId?: string;
  @ApiPropertyOptional() @IsNumber() @IsOptional() salePrice?: number;
  @ApiPropertyOptional() @IsNumber() @IsOptional() costPrice?: number;
  @ApiPropertyOptional() @IsUUID() @IsOptional() uomId?: string;
  @ApiPropertyOptional() @IsUUID() @IsOptional() purchaseUomId?: string;
  @ApiPropertyOptional() @IsUUID() @IsOptional() taxId?: string;
  @ApiPropertyOptional() @IsBoolean() @IsOptional() canBeSold?: boolean;
  @ApiPropertyOptional() @IsBoolean() @IsOptional() canBePurchased?: boolean;
  @ApiPropertyOptional({ enum: InvoicePolicy })
  @IsEnum(InvoicePolicy)
  @IsOptional()
  invoicePolicy?: InvoicePolicy;
  @ApiPropertyOptional() @IsString() @IsOptional() description?: string;
  @ApiPropertyOptional() @IsBoolean() @IsOptional() isActive?: boolean;
}
export class UpdateProductDto extends PartialType(CreateProductDto) {
  @ApiProperty() @IsInt() @Min(0) version: number;
}
export class FilterProductDto {
  @ApiPropertyOptional() search?: string;
  @ApiPropertyOptional({ enum: ProductType }) type?: ProductType;
  @ApiPropertyOptional() categoryId?: string;
  @ApiPropertyOptional() isActive?: boolean;
  @ApiPropertyOptional() page?: number;
  @ApiPropertyOptional() limit?: number;
}
