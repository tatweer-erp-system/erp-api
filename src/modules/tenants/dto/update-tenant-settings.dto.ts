import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class EmailNotificationsDto {
  @ApiPropertyOptional({ description: 'Notify on new user creation' })
  @IsOptional()
  @IsBoolean()
  newUser?: boolean;

  @ApiPropertyOptional({ description: 'Notify on login alert' })
  @IsOptional()
  @IsBoolean()
  loginAlert?: boolean;

  @ApiPropertyOptional({ description: 'Notify on payment due' })
  @IsOptional()
  @IsBoolean()
  paymentDue?: boolean;
}

export class UpdateTenantSettingsDto {
  @ApiPropertyOptional({ description: 'Timezone', example: 'Asia/Riyadh' })
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiPropertyOptional({ description: 'Language', example: 'en' })
  @IsOptional()
  @IsString()
  language?: string;

  @ApiPropertyOptional({ description: 'Currency', example: 'SAR' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ description: 'Date format', example: 'DD/MM/YYYY' })
  @IsOptional()
  @IsString()
  dateFormat?: string;

  @ApiPropertyOptional({ description: 'Session timeout in minutes', example: 30 })
  @IsOptional()
  @IsInt()
  @Min(1)
  sessionTimeout?: number;

  @ApiPropertyOptional({ description: 'Whether MFA is required' })
  @IsOptional()
  @IsBoolean()
  mfaRequired?: boolean;

  @ApiPropertyOptional({ description: 'Max failed login attempts before lockout', example: 5 })
  @IsOptional()
  @IsInt()
  @Min(1)
  maxFailedLoginAttempts?: number;

  @ApiPropertyOptional({ description: 'Account lockout duration in minutes', example: 30 })
  @IsOptional()
  @IsInt()
  @Min(1)
  accountLockoutDuration?: number;

  @ApiPropertyOptional({
    description: 'Email notification preferences',
    type: EmailNotificationsDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => EmailNotificationsDto)
  emailNotifications?: EmailNotificationsDto;

  @ApiPropertyOptional({ description: 'Whether API access is enabled' })
  @IsOptional()
  @IsBoolean()
  apiAccessEnabled?: boolean;
}
