import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID, IsEnum, IsDateString } from 'class-validator';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { PayslipStatus } from '@/common/enums/hr-new.enums';

export class PayslipFilterDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'Filter by status', enum: PayslipStatus })
  @IsOptional()
  @IsEnum(PayslipStatus)
  status?: PayslipStatus;

  @ApiPropertyOptional({ description: 'Filter by employee ID', format: 'uuid' })
  @IsOptional()
  @IsUUID()
  employeeId?: string;

  @ApiPropertyOptional({ description: 'Filter by period start (from)', example: '2026-03-01' })
  @IsOptional()
  @IsDateString()
  periodStart?: string;

  @ApiPropertyOptional({ description: 'Filter by period end (to)', example: '2026-03-31' })
  @IsOptional()
  @IsDateString()
  periodEnd?: string;
}
