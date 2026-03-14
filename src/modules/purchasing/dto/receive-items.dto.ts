import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsNumber,
  IsArray,
  ValidateNested,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ReceiveLineDto {
  @ApiProperty({ description: 'Purchase order line ID', format: 'uuid' })
  @IsNotEmpty()
  @IsNotEmpty()
  lineId!: string;

  @ApiProperty({ description: 'Quantity received', minimum: 1 })
  @IsNumber()
  @Min(1)
  receivedQuantity!: number;
}

export class ReceiveItemsDto {
  @ApiProperty({ description: 'Lines to receive', type: [ReceiveLineDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReceiveLineDto)
  lines!: ReceiveLineDto[];

  @ApiPropertyOptional({ description: 'Destination warehouse ID', format: 'uuid' })
  @IsOptional()
  @IsUUID()
  warehouseId?: string;
}
