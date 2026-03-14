import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsNumber, Min } from 'class-validator';

export class IssueCreditNoteDto {
  @ApiPropertyOptional({ description: 'Refund amount for credit note' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  refundAmount?: number;
}
