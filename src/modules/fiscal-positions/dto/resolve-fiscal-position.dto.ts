import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';

export class ResolveFiscalPositionDto {
  @ApiProperty({ description: 'Partner ID to resolve fiscal position for' })
  @IsUUID()
  partnerId!: string;

  @ApiProperty({ description: 'Array of tax IDs to map through the fiscal position' })
  @IsArray()
  @IsUUID('4', { each: true })
  @Type(() => String)
  taxIds!: string[];
}
