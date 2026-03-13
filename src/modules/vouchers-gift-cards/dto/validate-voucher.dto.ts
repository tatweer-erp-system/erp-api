import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class ValidateVoucherDto {
  @ApiProperty({ example: 'SUMMER2026' })
  @IsString()
  @IsNotEmpty()
  code!: string;

  @ApiProperty({ example: 250.0 })
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  orderTotal!: number;

  @ApiPropertyOptional({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsOptional()
  @IsUUID()
  customerId?: string;
}
