import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class MarkDoneActivityDto {
  @ApiPropertyOptional({ description: 'Optional feedback note when marking the activity as done' })
  @IsOptional()
  @IsString()
  feedbackNote?: string;
}
