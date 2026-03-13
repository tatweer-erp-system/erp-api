import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CloseSessionDto {
  @ApiProperty({ example: 1250.5, description: 'Physical cash count at end of shift' })
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  closingFloat!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
