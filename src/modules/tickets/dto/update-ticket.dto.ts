import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsEnum, IsUUID } from 'class-validator';
import { TicketStatus, TicketPriority } from '@/common/enums/ticket.enums';

export class UpdateTicketDto {
  @ApiPropertyOptional({
    description: 'Ticket status',
    enum: TicketStatus,
  })
  @IsOptional()
  @IsEnum(TicketStatus)
  status?: TicketStatus;

  @ApiPropertyOptional({
    description: 'Priority level',
    enum: TicketPriority,
  })
  @IsOptional()
  @IsEnum(TicketPriority)
  priority?: TicketPriority;

  @ApiPropertyOptional({ description: 'Assigned admin user ID' })
  @IsOptional()
  @IsUUID()
  assignedTo?: string;

  @ApiPropertyOptional({ description: 'Assigned admin user name' })
  @IsOptional()
  @IsString()
  assignedToName?: string;
}
