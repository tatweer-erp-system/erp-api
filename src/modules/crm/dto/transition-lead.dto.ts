import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum } from 'class-validator';
import { LeadStatus } from '@/common/enums/crm.enums';

export class TransitionLeadDto {
  @ApiProperty({
    enum: LeadStatus,
  })
  @IsString()
  @IsEnum(LeadStatus)
  status!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;
}
