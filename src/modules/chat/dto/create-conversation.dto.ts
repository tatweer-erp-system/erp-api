import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsArray, IsUUID, IsIn, IsOptional } from 'class-validator';

export class CreateConversationDto {
  @ApiProperty({
    description: 'Conversation type',
    enum: ['direct', 'group'],
    example: 'direct',
  })
  @IsString()
  @IsIn(['direct', 'group'])
  type!: 'direct' | 'group';

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
