import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsEnum } from 'class-validator';

export class AdminChangePlanDto {
  @ApiProperty({ description: 'Tenant ID' })
  @IsString()
  @IsNotEmpty()
  tenantId: string;

  @ApiProperty({ example: 'enterprise' })
  @IsString()
  @IsNotEmpty()
  planSlug: string;

  @ApiProperty({ enum: ['monthly', 'annual'], example: 'monthly' })
  @IsEnum(['monthly', 'annual'])
  billingCycle: 'monthly' | 'annual';
}
