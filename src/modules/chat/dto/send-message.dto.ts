import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsIn, IsUUID } from 'class-validator';

export class SendMessageDto {
  @ApiProperty({ description: 'Conversation ID' })
  @IsUUID()
  conversationId!: string;

  @ApiProperty({ description: 'Message content', example: 'Hello team!' })
  @IsString()
  content!: string;

  @ApiPropertyOptional({
    description: 'Message type',
    enum: ['text', 'file', 'image'],
    default: 'text',
  })
  @IsOptional()
  @IsString()
  @IsIn(['text', 'file', 'image'])
  type?: 'text' | 'file' | 'image';

  @ApiPropertyOptional({ description: 'ID of the message being replied to' })
  @IsOptional()
  @IsString()
  replyToId?: string;
}
