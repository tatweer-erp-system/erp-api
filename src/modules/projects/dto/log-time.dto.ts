import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class LogTimeDto {
  @ApiProperty({ description: 'Hours to log', minimum: 0.01 })
  @IsNotEmpty()
  @IsNumber()
  @Min(0.01)
  hours!: number;

  @ApiPropertyOptional({ description: 'Description of the work done' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Date of the time entry (YYYY-MM-DD)' })
  @IsNotEmpty()
  @IsString()
  date!: string;
}
