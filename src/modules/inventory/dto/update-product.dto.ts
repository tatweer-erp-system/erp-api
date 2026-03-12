import { PartialType, OmitType, ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty } from 'class-validator';
import { CreateProductDto } from './create-product.dto';

export class UpdateProductDto extends PartialType(OmitType(CreateProductDto, ['sku'] as const)) {
  @ApiProperty({ description: 'Record version for optimistic locking', example: 1 })
  @IsNotEmpty()
  @IsInt()
  version!: number;
}
