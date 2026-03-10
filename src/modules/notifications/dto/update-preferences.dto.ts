import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsString, IsBoolean, IsIn, IsArray, ValidateNested } from 'class-validator';

export class UpdatePreferenceItemDto {
  @ApiProperty({ description: 'Event type identifier', example: 'invoice.created' })
  @IsString()
  eventType!: string;

  @ApiProperty({
    description: 'Notification channel',
    enum: ['push', 'email', 'sms', 'in_app'],
  })
  @IsString()
  @IsIn(['push', 'email', 'sms', 'in_app'])
  channel!: string;

  @ApiProperty({ description: 'Whether the channel is enabled for this event' })
  @IsBoolean()
  enabled!: boolean;
}

export class UpdatePreferencesDto {
  @ApiProperty({ type: [UpdatePreferenceItemDto], description: 'List of preference updates' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdatePreferenceItemDto)
  preferences!: UpdatePreferenceItemDto[];
}
