import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsInt, IsEnum, IsNotEmpty, Min, MaxLength } from 'class-validator';
import { LoyaltyAdjustAction } from '@/common/enums/pos.enums';

export class AdjustPointsDto {
  @ApiProperty({ enum: LoyaltyAdjustAction })
  @IsEnum(LoyaltyAdjustAction)
  actionType!: LoyaltyAdjustAction;

  @ApiProperty({ example: 500, description: 'Number of points to adjust (always positive)' })
  @IsInt()
  @Min(1)
  points!: number;

  @ApiProperty({ example: 'Customer complaint compensation' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  notes!: string;
}
