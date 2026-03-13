import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum } from 'class-validator';
import { TicketReplySender } from '@/common/enums/ticket.enums';

export class CreateTicketReplyDto {
  @ApiProperty({ description: 'Reply message' })
  @IsString()
  message!: string;

  @ApiPropertyOptional({
    description: 'Sender type',
    enum: TicketReplySender,
  })
  @IsOptional()
  @IsEnum(TicketReplySender)
  senderType?: TicketReplySender;
}
