import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsEnum, IsUUID } from 'class-validator';
import { TicketStatus, TicketPriority } from '@/common/enums/ticket.enums';
import { PaginationDto } from '@/common/dto/pagination.dto';

export class TicketQueryDto extends PaginationDto {
  @ApiPropertyOptional({
    description: 'Filter by status',
    enum: TicketStatus,
  })
  @IsOptional()
  @IsEnum(TicketStatus)
  status?: TicketStatus;

  @ApiPropertyOptional({
    description: 'Filter by priority',
    enum: TicketPriority,
  })
  @IsOptional()
  @IsEnum(TicketPriority)
  priority?: TicketPriority;

  @ApiPropertyOptional({ description: 'Filter by tenant ID' })
  @IsOptional()
  @IsUUID()
  tenantId?: string;

  @ApiPropertyOptional({ description: 'Filter by assigned user ID' })
  @IsOptional()
  @IsString()
  assignedTo?: string;
}
