import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsUUID, IsDateString, IsString } from 'class-validator';

/**
 * DTO for creating a vendor bill (in_invoice) from a purchase order.
 * Lines are auto-populated from the PO lines (remaining qty to bill).
 */
export class CreatePoBillDto {
  @ApiProperty({ description: 'Bill date (ISO format)', example: '2026-03-17' })
  @IsNotEmpty()
  @IsDateString()
  invoiceDate!: string;

  @ApiPropertyOptional({ description: 'Due date (ISO format)', example: '2026-04-17' })
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiPropertyOptional({ description: 'External vendor invoice reference' })
  @IsOptional()
  @IsString()
  reference?: string;

  @ApiPropertyOptional({ description: 'Journal ID for posting' })
  @IsOptional()
  @IsUUID()
  journalId?: string;
}
