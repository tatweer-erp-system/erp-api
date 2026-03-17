import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsEnum, Min } from 'class-validator';
import { LeaveAllocationMode } from '@/common/enums/hr-new.enums';

export class UpdateLeaveAllocationDto {
  @ApiPropertyOptional({ description: 'Allocation year' })
  @IsOptional()
  @IsNumber()
  year?: number;

  @ApiPropertyOptional({ description: 'Number of days allocated' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  numberOfDays?: number;

  @ApiPropertyOptional({ description: 'Allocation mode', enum: LeaveAllocationMode })
  @IsOptional()
  @IsEnum(LeaveAllocationMode)
  mode?: LeaveAllocationMode;

  @ApiProperty({ description: 'Optimistic lock version' })
  @IsNumber()
  version!: number;
}
