import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsNumber, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateBankStatementLineDto {
  @ApiProperty({ description: 'Transaction date', example: '2026-03-15' })
  @IsDateString()
  date!: string;

  @ApiPropertyOptional({ description: 'Transaction reference' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  reference?: string;

  @ApiPropertyOptional({ description: 'Partner/counterparty name' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  partnerName?: string;

  @ApiProperty({ description: 'Transaction amount (positive for credit, negative for debit)' })
  @IsNumber()
  amount!: number;
}
