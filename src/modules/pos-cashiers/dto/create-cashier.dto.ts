import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateCashierDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsUUID()
  @IsNotEmpty()
  userId!: string;

  @ApiProperty({ example: '1234', description: '4-6 digit PIN' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{4,6}$/, { message: 'PIN must be 4 to 6 digits' })
  pin!: string;

  @ApiProperty({ example: 'Ahmed Cashier' })
  @IsString()
  @IsNotEmpty()
  displayName!: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ default: 10, description: 'Maximum discount percentage allowed' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  @Max(100)
  maxDiscountPct?: number;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  canRefund?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  canVoid?: boolean;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  canOpenDrawer?: boolean;
}
