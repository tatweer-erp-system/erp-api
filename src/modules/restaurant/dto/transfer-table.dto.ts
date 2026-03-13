import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsUUID } from 'class-validator';

export class TransferTableDto {
  @ApiProperty({ description: 'Destination table ID' })
  @IsUUID()
  @IsNotEmpty()
  toTableId!: string;
}
