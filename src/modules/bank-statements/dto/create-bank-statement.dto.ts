import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsNumber, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateBankStatementDto {
  @ApiProperty({ description: 'Branch ID' })
  @IsUUID()
  branchId!: string;

  @ApiPropertyOptional({ description: 'Journal ID for accounting link' })
  @IsOptional()
  @IsUUID()
  journalId?: string;

  @ApiProperty({ description: 'Statement name/reference', example: 'Bank Statement March 2026' })
  @IsString()
  @MaxLength(100)
  name!: string;

  @ApiProperty({ description: 'Statement period start date', example: '2026-03-01' })
  @IsDateString()
  dateFrom!: string;

  @ApiProperty({ description: 'Statement period end date', example: '2026-03-31' })
  @IsDateString()
  dateTo!: string;

  @ApiProperty({ description: 'Opening balance', example: 10000 })
  @IsNumber()
  balanceStart!: number;

  @ApiProperty({ description: 'Closing balance per bank statement', example: 15000 })
  @IsNumber()
  balanceEnd!: number;
}
