import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsArray, IsUUID, IsEnum, IsOptional } from 'class-validator';
import { ChatRoomType } from '@/common/enums/chat.enums';

export class CreateConversationDto {
  @ApiProperty({
    description: 'Conversation type',
    enum: ChatRoomType,
    example: ChatRoomType.DIRECT,
  })
  @IsEnum(ChatRoomType)
  type!: ChatRoomType;

  @ApiPropertyOptional({
    description: 'Conversation name (required for group conversations)',
    example: 'Project Alpha Team',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({
    description: 'List of participant user IDs',
    type: [String],
    example: ['uuid-1', 'uuid-2'],
  })
  @IsArray()
  @IsUUID('4', { each: true })
  participantIds!: string[];
}
