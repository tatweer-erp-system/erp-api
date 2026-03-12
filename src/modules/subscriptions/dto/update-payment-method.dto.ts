import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class UpdatePaymentMethodDto {
  @ApiProperty({ description: 'Tenant ID' })
  @IsString()
  @IsNotEmpty()
  tenantId: string;

  @ApiProperty({ description: 'Payment token from payment provider (e.g., Moyasar token)' })
  @IsString()
  @IsNotEmpty()
  paymentToken: string;

  @ApiPropertyOptional({ description: 'Card last four digits for display' })
  @IsOptional()
  @IsString()
  cardLastFour?: string;

  @ApiPropertyOptional({ description: 'Card brand (visa, mastercard, etc.)' })
  @IsOptional()
  @IsString()
  cardBrand?: string;

  @ApiPropertyOptional({ description: 'Card expiry (MM/YY)' })
  @IsOptional()
  @IsString()
  cardExpiry?: string;
}
