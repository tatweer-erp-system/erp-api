import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsIn } from 'class-validator';

export class CreateTemplateDto {
  @ApiProperty({ description: 'Event type identifier', example: 'invoice.created' })
  @IsString()
  eventType!: string;

  @ApiProperty({
    description: 'Notification channel for this template',
    enum: ['push', 'email', 'sms'],
  })
  @IsString()
  @IsIn(['push', 'email', 'sms'])
  channel!: string;

  @ApiPropertyOptional({ description: 'Email subject in English' })
  @IsOptional()
  @IsString()
  subject_en?: string;

  @ApiPropertyOptional({ description: 'Email subject in Arabic' })
  @IsOptional()
  @IsString()
  subject_ar?: string;

  @ApiProperty({ description: 'Template body in English (supports Handlebars syntax)' })
  @IsString()
  body_en!: string;

  @ApiProperty({ description: 'Template body in Arabic (supports Handlebars syntax)' })
  @IsString()
  body_ar!: string;
}
