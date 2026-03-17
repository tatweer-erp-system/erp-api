import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class CreateComboProductDto {
  @ApiProperty({ description: 'The parent product ID for this combo' })
  @IsUUID()
  productId!: string;
}
