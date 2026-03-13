import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum } from 'class-validator';
import { NotificationChannel } from '@/common/enums/notification.enums';

export class CreateTemplateDto {
  @ApiProperty({ description: 'Event type identifier', example: 'invoice.created' })
  @IsString()
  eventType!: string;

  @ApiProperty({
    description: 'Notification channel for this template',
    enum: NotificationChannel,
  })
  @IsEnum(NotificationChannel)
  channel!: NotificationChannel;

  @ApiPropertyOptional({ description: 'Email subject in English' })
  @IsOptional()
  @IsString()
  subjectEn?: string;

  @ApiPropertyOptional({ description: 'Email subject in Arabic' })
  @IsOptional()
  @IsString()
  subjectAr?: string;

  @ApiProperty({ description: 'Template body in English (supports Handlebars syntax)' })
  @IsString()
  bodyEn!: string;

  @ApiProperty({ description: 'Template body in Arabic (supports Handlebars syntax)' })
  @IsString()
  bodyAr!: string;
}
