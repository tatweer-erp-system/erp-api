import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
import { TenantNotePriority } from '@/common/enums/tenant.enums';

export class CreateTenantNoteDto {
  @ApiProperty({ description: 'Note content', example: 'Tenant requested custom onboarding.' })
  @IsNotEmpty()
  @IsString()
  content: string;

  @ApiPropertyOptional({
    description: 'Note priority',
    enum: TenantNotePriority,
    default: 'normal',
  })
  @IsOptional()
  @IsEnum(TenantNotePriority)
  priority?: TenantNotePriority = TenantNotePriority.NORMAL;

  @ApiPropertyOptional({ description: 'Linked support ticket ID' })
  @IsOptional()
  @IsUUID()
  linkedTicketId?: string;
}
