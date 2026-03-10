import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsNotEmpty } from 'class-validator';

export class CreateWarehouseDto {
  @ApiProperty({ example: 'Main Warehouse' })
  @IsString()
  @IsNotEmpty()
  name_en!: string;

  @ApiProperty({ example: 'المستودع الرئيسي' })
  @IsString()
  @IsNotEmpty()
  name_ar!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
