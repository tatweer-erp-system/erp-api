import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class OpenSessionDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsUUID()
  @IsNotEmpty()
  terminalId!: string;

  @ApiProperty({ example: 500.0, description: 'Cash count in the drawer at start of shift' })
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  openingFloat!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
