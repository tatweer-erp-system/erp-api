import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { LeadActivityType } from '@/common/enums/crm.enums';

export class CreateLeadActivityDto {
  @ApiProperty({ enum: LeadActivityType })
  @IsEnum(LeadActivityType)
  activityType!: LeadActivityType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
