import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString, IsUUID } from 'class-validator';

export class SendEmailDto {
  @ApiProperty({ description: 'Email template ID' })
  @IsUUID()
  templateId!: string;

  @ApiProperty({ description: 'ID of the record to use for variable resolution' })
  @IsUUID()
  recordId!: string;

  @ApiProperty({ description: 'Recipient email addresses', type: [String] })
  @IsArray()
  @IsString({ each: true })
  toEmails!: string[];

  @ApiPropertyOptional({ description: 'Extra note appended to the email body' })
  @IsOptional()
  @IsString()
  extraNote?: string;
}
