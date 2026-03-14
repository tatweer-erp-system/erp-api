import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class RegisterFcmTokenDto {
  @ApiProperty({ description: 'FCM device token' })
  @IsString()
  token!: string;

  @ApiPropertyOptional({ description: 'Device type (e.g. android, ios, web)' })
  @IsOptional()
  @IsString()
  deviceType?: string;
}
