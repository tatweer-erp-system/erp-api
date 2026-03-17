import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsUUID } from 'class-validator';

export class MatchLineDto {
  @ApiPropertyOptional({ description: 'Payment ID to match against' })
  @IsOptional()
  @IsUUID()
  paymentId?: string;

  @ApiPropertyOptional({ description: 'Journal entry ID to match against' })
  @IsOptional()
  @IsUUID()
  journalEntryId?: string;

  @ApiPropertyOptional({ description: 'Create a new payment for this line', default: false })
  @IsOptional()
  @IsBoolean()
  createNewPayment?: boolean;
}
