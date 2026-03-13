import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsUUID } from 'class-validator';
import { ChatMessageType } from '@/common/enums/chat.enums';

export class SendMessageDto {
  @ApiProperty({ description: 'Conversation ID' })
  @IsUUID()
  conversationId!: string;

  @ApiProperty({ description: 'Message content', example: 'Hello team!' })
  @IsString()
  content!: string;

  @ApiPropertyOptional({
    description: 'Message type',
    enum: ChatMessageType,
    default: ChatMessageType.TEXT,
  })
  @IsOptional()
  @IsEnum(ChatMessageType)
  type?: ChatMessageType;

  @ApiPropertyOptional({ description: 'ID of the message being replied to' })
  @IsOptional()
  @IsString()
  replyToId?: string;
}
