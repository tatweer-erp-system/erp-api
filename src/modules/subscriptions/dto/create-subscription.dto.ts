import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsEnum, IsOptional, IsNumber, Min } from 'class-validator';

export class CreateSubscriptionDto {
  @ApiProperty({ example: 'professional' })
  @IsString()
  planSlug: string;

  @ApiProperty({ enum: ['monthly', 'annual'], example: 'monthly' })
  @IsEnum(['monthly', 'annual'])
  billingCycle: 'monthly' | 'annual';
}

export class InitiatePaymentDto {
  @ApiProperty({ example: 'professional' })
  @IsString()
  planSlug: string;

  @ApiProperty({ enum: ['monthly', 'annual'], example: 'monthly' })
  @IsEnum(['monthly', 'annual'])
  billingCycle: 'monthly' | 'annual';

  @ApiPropertyOptional({ example: 'https://myapp.com/payment/result' })
  @IsOptional()
  @IsString()
  frontendRedirectUrl?: string;
}

export class UpgradeSubscriptionDto {
  @ApiProperty({ example: 'enterprise' })
  @IsString()
  planSlug: string;

  @ApiProperty({ enum: ['monthly', 'annual'], example: 'monthly' })
  @IsEnum(['monthly', 'annual'])
  billingCycle: 'monthly' | 'annual';
}

export class ExtendTrialDto {
  @ApiProperty({ description: 'Tenant ID to extend trial for' })
  @IsString()
  tenantId: string;

  @ApiProperty({ example: 14, description: 'Number of days to extend the trial' })
  @IsNumber()
  @Min(1)
  days: number;
}
