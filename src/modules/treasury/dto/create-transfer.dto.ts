import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class CreateTransferDto {
  @ApiProperty({ description: 'Source account ID' })
  @IsUUID()
  sourceAccountId!: string;

  @ApiProperty({ description: 'Destination account ID' })
  @IsUUID()
  destinationAccountId!: string;

  @ApiProperty({ example: 5000, description: 'Amount in source account currency' })
  @IsNumber()
  @Min(0.01)
  amount!: number;

  @ApiProperty({ example: '2026-03-13' })
  @IsDateString()
  date!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reference?: string;
}
