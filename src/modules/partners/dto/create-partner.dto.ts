import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsBoolean,
  IsEmail,
  IsNumber,
  IsUUID,
  IsInt,
  Min,
} from 'class-validator';
import { PartnerType } from '@/common/enums/inventory.enums';

export class CreatePartnerDto {
  @ApiProperty() @IsString() @IsNotEmpty() nameEn: string;
  @ApiProperty() @IsString() @IsNotEmpty() nameAr: string;
  @ApiProperty({ enum: PartnerType }) @IsEnum(PartnerType) type: PartnerType;
  @ApiPropertyOptional() @IsString() @IsOptional() phone?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() mobile?: string;
  @ApiPropertyOptional() @IsEmail() @IsOptional() email?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() taxNumber?: string;
  @ApiPropertyOptional() @IsBoolean() @IsOptional() isCustomer?: boolean;
  @ApiPropertyOptional() @IsBoolean() @IsOptional() isSupplier?: boolean;
  @ApiPropertyOptional() @IsUUID() @IsOptional() pricelistId?: string;
  @ApiPropertyOptional() @IsUUID() @IsOptional() paymentTermId?: string;
  @ApiPropertyOptional() @IsNumber() @IsOptional() creditLimit?: number;
  @ApiPropertyOptional() @IsString() @IsOptional() address?: string;
  @ApiPropertyOptional() @IsBoolean() @IsOptional() isActive?: boolean;
}
export class UpdatePartnerDto extends PartialType(CreatePartnerDto) {
  @ApiProperty() @IsInt() @Min(0) version: number;
}
export class FilterPartnerDto {
  @ApiPropertyOptional() search?: string;
  @ApiPropertyOptional({ enum: PartnerType }) type?: PartnerType;
  @ApiPropertyOptional() isCustomer?: boolean;
  @ApiPropertyOptional() isSupplier?: boolean;
  @ApiPropertyOptional() isActive?: boolean;
  @ApiPropertyOptional() page?: number;
  @ApiPropertyOptional() limit?: number;
}
