import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID, IsDateString, IsString } from 'class-validator';

/**
 * DTO for creating a goods receipt from a purchase order.
 * Lines are auto-populated from the PO lines (remaining qty to receive).
 */
export class CreatePoReceiptDto {
  @ApiPropertyOptional({ description: 'Scheduled date for receipt (ISO format)' })
  @IsOptional()
  @IsDateString()
  scheduledDate?: string;

  @ApiPropertyOptional({ description: 'Responsible user ID', format: 'uuid' })
  @IsOptional()
  @IsUUID()
  responsibleId?: string;

  @ApiPropertyOptional({ description: 'Additional notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}
