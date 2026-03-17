import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsUUID, IsEnum, IsBoolean } from 'class-validator';
import { LocationType } from '@/common/enums/inventory-new.enums';

export class CreateStockLocationDto {
  @ApiProperty({ description: 'English name' })
  @IsString()
  nameEn!: string;

  @ApiProperty({ description: 'Arabic name' })
  @IsString()
  nameAr!: string;

  @ApiPropertyOptional({ description: 'Full hierarchical name' })
  @IsOptional()
  @IsString()
  fullName?: string;

  @ApiPropertyOptional({ description: 'Parent warehouse ID' })
  @IsOptional()
  @IsUUID()
  warehouseId?: string;

  @ApiPropertyOptional({ description: 'Parent location ID for hierarchy' })
  @IsOptional()
  @IsUUID()
  parentId?: string;

  @ApiPropertyOptional({ enum: LocationType, default: LocationType.INTERNAL })
  @IsOptional()
  @IsEnum(LocationType)
  locationType?: LocationType;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isScrap?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isReturn?: boolean;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
