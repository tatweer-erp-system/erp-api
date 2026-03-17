import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateEmailTemplateDto {
  @ApiProperty({ description: 'Template name in English', example: 'Invoice Email' })
  @IsString()
  @MaxLength(255)
  nameEn!: string;

  @ApiProperty({ description: 'Template name in Arabic', example: 'بريد الفاتورة' })
  @IsString()
  @MaxLength(255)
  nameAr!: string;

  @ApiProperty({
    description: 'Which record type this template applies to',
    example: 'invoice',
  })
  @IsString()
  @MaxLength(50)
  model!: string;

  @ApiProperty({ description: 'Email subject line', example: 'Your Invoice {{ record.number }}' })
  @IsString()
  @MaxLength(500)
  subject!: string;

  @ApiProperty({ description: 'Email body in English (HTML supported)' })
  @IsString()
  bodyEn!: string;

  @ApiProperty({ description: 'Email body in Arabic (HTML supported)' })
  @IsString()
  bodyAr!: string;

  @ApiPropertyOptional({ description: 'From email address' })
  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  fromEmail?: string;

  @ApiPropertyOptional({ description: 'Reply-to email address' })
  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  replyTo?: string;

  @ApiPropertyOptional({ description: 'CC email addresses (comma-separated)' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  ccEmails?: string;

  @ApiPropertyOptional({ description: 'Auto-attach PDF to email', default: false })
  @IsOptional()
  @IsBoolean()
  autoAttachPdf?: boolean;

  @ApiPropertyOptional({ description: 'Set as default template for this model', default: false })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
