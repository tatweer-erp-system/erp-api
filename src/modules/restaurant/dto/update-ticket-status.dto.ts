import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty } from 'class-validator';
import { KitchenTicketStatus } from '@/common/enums/pos.enums';

export class UpdateTicketStatusDto {
  @ApiProperty({ enum: KitchenTicketStatus, description: 'New ticket status' })
  @IsEnum(KitchenTicketStatus)
  @IsNotEmpty()
  status!: KitchenTicketStatus;
}
