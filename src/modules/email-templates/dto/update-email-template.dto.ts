import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEmail, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class UpdateEmailTemplateDto {
  @ApiProperty({ description: 'Optimistic locking version' })
  @IsInt()
  @Min(0)
  version!: number;

  @ApiPropertyOptional({ description: 'Template name in English' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  nameEn?: string;

  @ApiPropertyOptional({ description: 'Template name in Arabic' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  nameAr?: string;

  @ApiPropertyOptional({ description: 'Which record type this template applies to' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  model?: string;

  @ApiPropertyOptional({ description: 'Email subject line' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  subject?: string;

  @ApiPropertyOptional({ description: 'Email body in English (HTML supported)' })
  @IsOptional()
  @IsString()
  bodyEn?: string;

  @ApiPropertyOptional({ description: 'Email body in Arabic (HTML supported)' })
  @IsOptional()
  @IsString()
  bodyAr?: string;

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

  @ApiPropertyOptional({ description: 'Auto-attach PDF to email' })
  @IsOptional()
  @IsBoolean()
  autoAttachPdf?: boolean;

  @ApiPropertyOptional({ description: 'Set as default template for this model' })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @ApiPropertyOptional({ description: 'Activate or deactivate template' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
