import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';

export class CreateSequenceDto {
  @ApiPropertyOptional({ description: 'Branch ID (null = company-wide)', format: 'uuid' })
  @IsOptional()
  @IsUUID()
  branchId?: string;

  @ApiProperty({
    description: 'Entity type for the sequence',
    enum: ['sales_order', 'purchase_order', 'employee', 'lead', 'project', 'zatca_invoice'],
  })
  @IsString()
  @IsIn(['sales_order', 'purchase_order', 'employee', 'lead', 'project', 'zatca_invoice'])
  entity!: string;

  @ApiProperty({ description: 'Prefix for the generated number (e.g. SO, PO)', maxLength: 20 })
  @IsString()
  @MaxLength(20)
  prefix!: string;

  @ApiPropertyOptional({ description: 'Zero-padding length (default 5)', minimum: 1, maximum: 10 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  padding?: number;

  @ApiPropertyOptional({
    description: 'Counter reset cycle',
    enum: ['never', 'yearly', 'monthly'],
    default: 'never',
  })
  @IsOptional()
  @IsString()
  @IsIn(['never', 'yearly', 'monthly'])
  resetCycle?: string;
}
