import { ApiProperty } from '@nestjs/swagger';
import { PartialType } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';
import { CreatePaymentTermDto } from './create-payment-term.dto';

export class UpdatePaymentTermDto extends PartialType(CreatePaymentTermDto) {
  @ApiProperty({ description: 'Record version for optimistic locking' })
  @IsInt()
  @Min(0)
  version!: number;
}
