import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { ActivityType } from '@/common/enums/activity.enums';

export class CreateActivityDto {
  @ApiProperty({ description: 'Polymorphic model name (e.g. invoice, sale_order, partner)' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  model!: string;

  @ApiProperty({ description: 'ID of the record this activity belongs to', format: 'uuid' })
  @IsUUID()
  recordId!: string;

  @ApiPropertyOptional({ description: 'Snapshot of the record name for display' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  recordName?: string;

  @ApiProperty({ description: 'Type of activity', enum: ActivityType })
  @IsEnum(ActivityType)
  activityType!: ActivityType;

  @ApiProperty({ description: 'Short summary of the activity' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  summary!: string;

  @ApiPropertyOptional({ description: 'Detailed note for the activity' })
  @IsOptional()
  @IsString()
  note?: string;

  @ApiProperty({
    description: 'Scheduled date for the activity (YYYY-MM-DD)',
    example: '2026-03-20',
  })
  @IsString()
  @IsNotEmpty()
  scheduledDate!: string;

  @ApiProperty({ description: 'User ID the activity is assigned to', format: 'uuid' })
  @IsUUID()
  assignedTo!: string;

  @ApiPropertyOptional({ description: 'Icon identifier for the activity type' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  icon?: string;
}
