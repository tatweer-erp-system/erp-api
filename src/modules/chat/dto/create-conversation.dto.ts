import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsArray, IsUUID, IsIn, IsOptional } from 'class-validator';

export class CreateConversationDto {
  @ApiProperty({ enum: ['direct', 'support', 'group'] })
  @IsString()
  @IsIn(['direct', 'support', 'group'])
  type!: 'direct' | 'support' | 'group';

  @ApiProperty({ type: [String] })
  @IsArray()
  @IsUUID('4', { each: true })
  participantIds!: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;
}
