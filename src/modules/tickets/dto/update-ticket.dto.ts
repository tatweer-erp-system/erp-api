import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsIn, IsUUID } from 'class-validator';

export class UpdateTicketDto {
  @ApiPropertyOptional({
    description: 'Ticket status',
    enum: ['open', 'in_progress', 'resolved', 'closed'],
  })
  @IsOptional()
  @IsIn(['open', 'in_progress', 'resolved', 'closed'])
  status?: string;

  @ApiPropertyOptional({
    description: 'Priority level',
    enum: ['low', 'medium', 'high', 'critical'],
  })
  @IsOptional()
  @IsIn(['low', 'medium', 'high', 'critical'])
  priority?: string;

  @ApiPropertyOptional({ description: 'Assigned admin user ID' })
  @IsOptional()
  @IsUUID()
  assignedTo?: string;

  @ApiPropertyOptional({ description: 'Assigned admin user name' })
  @IsOptional()
  @IsString()
  assignedToName?: string;
}
