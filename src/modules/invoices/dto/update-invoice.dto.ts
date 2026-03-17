import { ApiProperty, ApiPropertyOptional, PartialType, OmitType } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';
import { CreateInvoiceDto } from './create-invoice.dto';

export class UpdateInvoiceDto extends PartialType(
  OmitType(CreateInvoiceDto, ['invoiceType', 'branchId'] as const),
) {
  @ApiProperty({ description: 'Optimistic locking version' })
  @IsInt()
  @Min(0)
  version!: number;
}
