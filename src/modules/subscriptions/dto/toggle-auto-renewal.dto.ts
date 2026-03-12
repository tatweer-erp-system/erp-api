import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsString } from 'class-validator';

export class ToggleAutoRenewalDto {
  @ApiProperty({ description: 'Tenant ID' })
  @IsString()
  @IsNotEmpty()
  tenantId: string;

  @ApiProperty({ description: 'Whether auto-renewal is enabled', example: true })
  @IsBoolean()
  @IsNotEmpty()
  autoRenewal: boolean;
}
