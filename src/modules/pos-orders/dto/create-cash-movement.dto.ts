import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { CashMovementType } from '@/common/enums/pos.enums';

export class CreateCashMovementDto {
  @ApiProperty({ enum: CashMovementType, description: 'Movement type' })
  @IsEnum(CashMovementType)
  @IsNotEmpty()
  type!: CashMovementType;

  @ApiProperty({ description: 'Amount', example: 100 })
  @IsNumber()
  @Min(0.01)
  amount!: number;

  @ApiProperty({ description: 'Reason for the movement', example: 'Petty cash withdrawal' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  reason!: string;

  @ApiPropertyOptional({ description: 'Additional notes' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
