import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateCashierDto {
  @ApiProperty({ description: 'Optimistic locking version' })
  @IsInt()
  @IsNotEmpty()
  version!: number;

  @ApiPropertyOptional({ example: 'Ahmed Cashier' })
  @IsOptional()
  @IsString()
  displayName?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Maximum discount percentage allowed' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  @Max(100)
  maxDiscountPct?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  canRefund?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  canVoid?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  canOpenDrawer?: boolean;
}
