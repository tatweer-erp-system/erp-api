import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdateBankStatementDto {
  @ApiProperty({ description: 'Optimistic locking version' })
  @IsInt()
  @Min(0)
  version!: number;

  @ApiPropertyOptional({ description: 'Journal ID for accounting link' })
  @IsOptional()
  @IsUUID()
  journalId?: string;

  @ApiPropertyOptional({ description: 'Statement name/reference' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ description: 'Statement period start date' })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({ description: 'Statement period end date' })
  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @ApiPropertyOptional({ description: 'Opening balance' })
  @IsOptional()
  @IsNumber()
  balanceStart?: number;

  @ApiPropertyOptional({ description: 'Closing balance per bank statement' })
  @IsOptional()
  @IsNumber()
  balanceEnd?: number;
}
