import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsIn, IsUUID } from 'class-validator';
import { PaginationDto } from '@/common/dto/pagination.dto';

export class TicketQueryDto extends PaginationDto {
  @ApiPropertyOptional({
    description: 'Filter by status',
    enum: ['open', 'in_progress', 'resolved', 'closed'],
  })
  @IsOptional()
  @IsIn(['open', 'in_progress', 'resolved', 'closed'])
  status?: string;

  @ApiPropertyOptional({
    description: 'Filter by priority',
    enum: ['low', 'medium', 'high', 'critical'],
  })
  @IsOptional()
  @IsIn(['low', 'medium', 'high', 'critical'])
  priority?: string;

  @ApiPropertyOptional({ description: 'Filter by tenant ID' })
  @IsOptional()
  @IsUUID()
  tenantId?: string;

  @ApiPropertyOptional({ description: 'Filter by assigned user ID' })
  @IsOptional()
  @IsString()
  assignedTo?: string;
}
