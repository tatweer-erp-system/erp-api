import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsIn } from 'class-validator';

export class CreateTicketReplyDto {
  @ApiProperty({ description: 'Reply message' })
  @IsString()
  message!: string;

  @ApiPropertyOptional({
    description: 'Sender type',
    enum: ['agent', 'client'],
  })
  @IsOptional()
  @IsIn(['agent', 'client'])
  senderType?: string;
}
