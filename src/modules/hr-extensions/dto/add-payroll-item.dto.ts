import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PayrollItemType } from '@/common/enums/hr.enums';

export class AddPayrollItemDto {
  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  employeeId!: string;

  @ApiPropertyOptional({ enum: PayrollItemType })
  @IsOptional()
  @IsEnum(PayrollItemType)
  itemType?: PayrollItemType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  /**
   * Number of absent days to deduct.
   */
  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  absentDays?: number;

  /**
   * Additional bonus amount in SAR.
   */
  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  bonusAmount?: number;

  /**
   * Pending salary advance amount to deduct (capped at 25% of net by Saudi labor law).
   */
  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  pendingAdvance?: number;
}
