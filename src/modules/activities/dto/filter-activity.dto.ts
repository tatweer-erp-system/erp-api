import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { Transform } from 'class-transformer';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { ActivityType } from '@/common/enums/activity.enums';

export class FilterActivityDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'Filter by model name (e.g. invoice, sale_order)' })
  @IsOptional()
  @IsString()
  model?: string;

  @ApiPropertyOptional({ description: 'Filter by record ID', format: 'uuid' })
  @IsOptional()
  @IsUUID()
  recordId?: string;

  @ApiPropertyOptional({ description: 'Filter by assigned user ID', format: 'uuid' })
  @IsOptional()
  @IsUUID()
  assignedTo?: string;

  @ApiPropertyOptional({ description: 'Filter by completion status' })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  isDone?: boolean;

  @ApiPropertyOptional({ description: 'Filter activities due before this date (YYYY-MM-DD)' })
  @IsOptional()
  @IsString()
  dueBefore?: string;

  @ApiPropertyOptional({ description: 'Filter activities due after this date (YYYY-MM-DD)' })
  @IsOptional()
  @IsString()
  dueAfter?: string;

  @ApiPropertyOptional({ description: 'Filter by activity type', enum: ActivityType })
  @IsOptional()
  @IsEnum(ActivityType)
  activityType?: ActivityType;
}
