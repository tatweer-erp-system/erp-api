import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsUUID,
  IsOptional,
  IsObject,
  IsArray,
  IsIn,
  IsDateString,
} from 'class-validator';

export class SendNotificationDto {
  @ApiProperty({ description: 'Target user ID' })
  @IsUUID()
  userId!: string;

  @ApiProperty({ description: 'Event type identifier', example: 'invoice.created' })
  @IsString()
  eventType!: string;

  @ApiProperty({ description: 'Notification title in English' })
  @IsString()
  title_en!: string;

  @ApiProperty({ description: 'Notification title in Arabic' })
  @IsString()
  title_ar!: string;

  @ApiProperty({ description: 'Notification body in English' })
  @IsString()
  body_en!: string;

  @ApiProperty({ description: 'Notification body in Arabic' })
  @IsString()
  body_ar!: string;

  @ApiPropertyOptional({ description: 'Additional data payload' })
  @IsOptional()
  @IsObject()
  data?: Record<string, unknown>;

  @ApiPropertyOptional({
    description: 'Channels to send through',
    enum: ['push', 'email', 'sms', 'in_app'],
    isArray: true,
  })
  @IsOptional()
  @IsArray()
  @IsIn(['push', 'email', 'sms', 'in_app'], { each: true })
  channels?: ('push' | 'email' | 'sms' | 'in_app')[];

  @ApiPropertyOptional({ description: 'ISO date string for scheduled delivery' })
  @IsOptional()
  @IsDateString()
  sendAt?: string;
}
