import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsUUID, IsNumber, IsString, IsOptional, Min } from 'class-validator';

export class CreateTransferDto {
  @ApiProperty()
  @IsUUID()
  productId!: string;

  @ApiProperty()
  @IsUUID()
  sourceWarehouseId!: string;

  @ApiProperty()
  @IsUUID()
  destinationWarehouseId!: string;

  @ApiProperty({ description: 'Quantity to transfer (must be positive)' })
  @IsNumber()
  @Min(1)
  quantity!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
