import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsUUID, Min } from 'class-validator';

export class CreateTableSessionDto {
  @ApiProperty({ description: 'Table ID' })
  @IsUUID()
  @IsNotEmpty()
  tableId!: string;

  @ApiProperty({ description: 'POS Order ID to link to this session' })
  @IsUUID()
  @IsNotEmpty()
  orderId!: string;

  @ApiPropertyOptional({ description: 'Number of guests', default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  guestCount?: number;
}
