import { ApiProperty } from '@nestjs/swagger';
import { ValidateNested, ArrayMaxSize, ArrayMinSize } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateProductDto } from './create-product.dto';

export class BulkCreateProductsDto {
  @ApiProperty({ type: [CreateProductDto] })
  @ValidateNested({ each: true })
  @Type(() => CreateProductDto)
  @ArrayMaxSize(100)
  @ArrayMinSize(1)
  items!: CreateProductDto[];
}
