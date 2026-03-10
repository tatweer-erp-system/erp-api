import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsIn } from 'class-validator';

export class TransitionLeadDto {
  @ApiProperty({
    enum: ['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost'],
  })
  @IsString()
  @IsIn(['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost'])
  status!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;
}
