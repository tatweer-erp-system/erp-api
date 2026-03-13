import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsUUID,
  IsOptional,
  IsObject,
  IsArray,
  IsEnum,
  IsDateString,
} from 'class-validator';
import { NotificationChannel } from '@/common/enums/notification.enums';

export class SendNotificationDto {
  @ApiProperty({ description: 'Target user ID' })
  @IsUUID()
  userId!: string;

  @ApiProperty({ description: 'Event type identifier', example: 'invoice.created' })
  @IsString()
  eventType!: string;

  @ApiProperty({ description: 'Notification title in English' })
  @IsString()
  titleEn!: string;

  @ApiProperty({ description: 'Notification title in Arabic' })
  @IsString()
  titleAr!: string;

  @ApiProperty({ description: 'Notification body in English' })
  @IsString()
  bodyEn!: string;

  @ApiProperty({ description: 'Notification body in Arabic' })
  @IsString()
  bodyAr!: string;

  @ApiPropertyOptional({ description: 'Additional data payload' })
  @IsOptional()
  @IsObject()
  data?: Record<string, unknown>;

  @ApiPropertyOptional({
    description: 'Channels to send through',
    enum: NotificationChannel,
    isArray: true,
  })
  @IsOptional()
  @IsArray()
  @IsEnum(NotificationChannel, { each: true })
  channels?: NotificationChannel[];

  @ApiPropertyOptional({ description: 'ISO date string for scheduled delivery' })
  @IsOptional()
  @IsDateString()
  sendAt?: string;
}
