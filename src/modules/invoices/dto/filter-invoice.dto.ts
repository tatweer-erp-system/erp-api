import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsEnum, IsUUID, IsDateString } from 'class-validator';
import { PaginationDto } from '@/common/dto/pagination.dto';
import {
  InvoiceTypeNew,
  InvoiceStatusNew,
  InvoicePaymentStatus,
} from '@/common/enums/invoice.enums';

export class FilterInvoiceDto extends PaginationDto {
  @ApiPropertyOptional({ enum: InvoiceTypeNew })
  @IsOptional()
  @IsEnum(InvoiceTypeNew)
  invoiceType?: InvoiceTypeNew;

  @ApiPropertyOptional({ enum: InvoiceStatusNew })
  @IsOptional()
  @IsEnum(InvoiceStatusNew)
  status?: InvoiceStatusNew;

  @ApiPropertyOptional({ enum: InvoicePaymentStatus })
  @IsOptional()
  @IsEnum(InvoicePaymentStatus)
  paymentStatus?: InvoicePaymentStatus;

  @ApiPropertyOptional({ description: 'Filter by partner ID' })
  @IsOptional()
  @IsUUID()
  partnerId?: string;

  @ApiPropertyOptional({ description: 'Filter by branch ID' })
  @IsOptional()
  @IsUUID()
  branchId?: string;

  @ApiPropertyOptional({ description: 'Invoice date from', example: '2026-01-01' })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({ description: 'Invoice date to', example: '2026-12-31' })
  @IsOptional()
  @IsDateString()
  dateTo?: string;
}
