import { IsOptional, IsBoolean, IsInt, Min, Max } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdatePosConfigDto {
  @ApiPropertyOptional({ description: 'Allow selling products with negative stock' })
  @IsOptional()
  @IsBoolean()
  allowNegativeStock?: boolean;

  @ApiPropertyOptional({
    description: 'Default POS tax rate percentage (0-100)',
    minimum: 0,
    maximum: 100,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  defaultTaxRate?: number;

  @ApiPropertyOptional({ description: 'Enable loyalty program in POS' })
  @IsOptional()
  @IsBoolean()
  loyaltyEnabled?: boolean;

  @ApiPropertyOptional({
    description: 'Maximum number of held orders per session (1-50)',
    minimum: 1,
    maximum: 50,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  maxHeldOrders?: number;
}
