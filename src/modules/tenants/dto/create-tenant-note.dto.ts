import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateTenantNoteDto {
  @ApiProperty({ description: 'Note content', example: 'Tenant requested custom onboarding.' })
  @IsNotEmpty()
  @IsString()
  content: string;

  @ApiPropertyOptional({
    description: 'Note priority',
    enum: ['normal', 'urgent'],
    default: 'normal',
  })
  @IsOptional()
  @IsString()
  @IsIn(['normal', 'urgent'])
  priority?: string = 'normal';

  @ApiPropertyOptional({ description: 'Linked support ticket ID' })
  @IsOptional()
  @IsUUID()
  linkedTicketId?: string;
}
