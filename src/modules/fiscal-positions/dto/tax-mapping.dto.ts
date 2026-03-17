import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';

export class TaxMappingDto {
  @ApiProperty({ description: 'Source tax ID to be replaced' })
  @IsUUID()
  taxSrcId!: string;

  @ApiPropertyOptional({ description: 'Destination tax ID (null = remove tax)' })
  @IsOptional()
  @IsUUID()
  taxDestId?: string;
}
