import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsNotEmpty, IsString } from 'class-validator';

export class CreateConsentDto {
  @ApiProperty({
    description: 'Type of consent',
    enum: ['marketing_email', 'sms_notifications', 'data_analytics', 'third_party_sharing'],
    example: 'marketing_email',
  })
  @IsNotEmpty()
  @IsString()
  @IsIn(['marketing_email', 'sms_notifications', 'data_analytics', 'third_party_sharing'])
  consentType: string;

  @ApiProperty({ description: 'Whether consent is granted', example: true })
  @IsNotEmpty()
  @IsBoolean()
  granted: boolean;
}
