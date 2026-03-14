import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsDateString } from 'class-validator';

export class InvoicePurchaseOrderDto {
  @ApiProperty({ description: 'Vendor invoice number' })
  @IsNotEmpty()
  @IsString()
  invoiceNumber!: string;

  @ApiProperty({ description: 'Invoice date (ISO 8601)', example: '2026-03-14' })
  @IsNotEmpty()
  @IsDateString()
  invoiceDate!: string;
}
