import { ApiProperty, PartialType, OmitType } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';
import { CreatePaymentDto } from './create-payment.dto';

export class UpdatePaymentDto extends PartialType(
  OmitType(CreatePaymentDto, ['paymentType', 'branchId'] as const),
) {
  @ApiProperty({ description: 'Optimistic locking version' })
  @IsInt()
  @Min(0)
  version!: number;
}
