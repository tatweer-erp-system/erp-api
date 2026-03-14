import { IsOptional, IsInt, Min, Max } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateHrConfigDto {
  @ApiPropertyOptional({
    description: 'Days before contract expiry to trigger warning (1-60)',
    minimum: 1,
    maximum: 60,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(60)
  contractExpiryWarningDays?: number;

  @ApiPropertyOptional({
    description: 'Maximum salary advance deduction percentage (1-25)',
    minimum: 1,
    maximum: 25,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(25)
  maxAdvanceDeductionPct?: number;
}
