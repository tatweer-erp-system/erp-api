import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class CreateReconciliationDto {
  @ApiProperty()
  @IsUUID()
  accountId!: string;

  @ApiProperty({ example: '2026-03-31', description: 'Bank statement date' })
  @IsDateString()
  statementDate!: string;

  @ApiProperty({ example: 0, description: 'Opening balance from bank statement' })
  @IsNumber()
  @Min(0)
  openingBalance!: number;

  @ApiProperty({ example: 50000, description: 'Closing balance from bank statement' })
  @IsNumber()
  closingBalance!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
