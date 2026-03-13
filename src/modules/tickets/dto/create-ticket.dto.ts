import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsUUID, MaxLength } from 'class-validator';
import { TicketPriority } from '@/common/enums/ticket.enums';

export class CreateTicketDto {
  @ApiProperty({ description: 'Ticket subject' })
  @IsString()
  @MaxLength(255)
  subject!: string;

  @ApiPropertyOptional({ description: 'Ticket description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Priority level',
    enum: TicketPriority,
  })
  @IsOptional()
  @IsEnum(TicketPriority)
  priority?: TicketPriority;

  @ApiPropertyOptional({ description: 'Tenant ID' })
  @IsOptional()
  @IsUUID()
  tenantId?: string;

  @ApiPropertyOptional({ description: 'Tenant name' })
  @IsOptional()
  @IsString()
  tenantName?: string;

  @ApiPropertyOptional({ description: 'Assigned admin user ID' })
  @IsOptional()
  @IsUUID()
  assignedTo?: string;

  @ApiPropertyOptional({ description: 'Assigned admin user name' })
  @IsOptional()
  @IsString()
  assignedToName?: string;
}
