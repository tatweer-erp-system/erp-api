import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class ReplyMessageDto {
  @ApiProperty()
  @IsString()
  text!: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  attachments?: string[];
}
