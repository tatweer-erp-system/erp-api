import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class WinLeadDto {
  @ApiPropertyOptional({ description: 'Optional notes about winning the lead' })
  @IsOptional()
  @IsString()
  notes?: string;
}
