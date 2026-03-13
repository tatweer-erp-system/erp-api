import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class UpdateOrderItemDto {
  @ApiPropertyOptional({ description: 'New quantity', example: 2 })
  @IsOptional()
  @IsNumber()
  @Min(0.001)
  quantity?: number;

  @ApiPropertyOptional({ description: 'Per-item discount amount' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  discountAmount?: number;

  @ApiPropertyOptional({ description: 'Course name' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  course?: string;

  @ApiPropertyOptional({ description: 'Item notes' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
