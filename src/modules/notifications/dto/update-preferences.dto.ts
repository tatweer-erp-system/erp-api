import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsString, IsBoolean, IsEnum, IsArray, ValidateNested } from 'class-validator';
import { NotificationChannel } from '@/common/enums/notification.enums';

export class UpdatePreferenceItemDto {
  @ApiProperty({ description: 'Event type identifier', example: 'invoice.created' })
  @IsString()
  eventType!: string;

  @ApiProperty({
    description: 'Notification channel',
    enum: NotificationChannel,
  })
  @IsEnum(NotificationChannel)
  channel!: NotificationChannel;

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
