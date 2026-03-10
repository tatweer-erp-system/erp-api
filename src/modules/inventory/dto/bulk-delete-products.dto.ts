import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, ArrayMaxSize, ArrayMinSize } from 'class-validator';

export class BulkDeleteProductsDto {
  @ApiProperty({ type: [String] })
  @IsUUID('4', { each: true })
  @ArrayMaxSize(100)
  @ArrayMinSize(1)
  ids!: string[];
}
