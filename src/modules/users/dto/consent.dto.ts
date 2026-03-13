import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsNotEmpty } from 'class-validator';
import { ConsentType } from '@/common/enums/user.enums';

export class CreateConsentDto {
  @ApiProperty({
    description: 'Type of consent',
    enum: ConsentType,
    example: 'marketing_email',
  })
  @IsNotEmpty()
  @IsEnum(ConsentType)
  consentType: ConsentType;

  @ApiProperty({ description: 'Whether consent is granted', example: true })
  @IsNotEmpty()
  @IsBoolean()
  granted: boolean;
}
