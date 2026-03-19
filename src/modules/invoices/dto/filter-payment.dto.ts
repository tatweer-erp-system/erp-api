import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsEnum, IsUUID, IsDateString } from 'class-validator';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { PaymentTypeNew, PaymentStatusNew } from '@/common/enums/invoice.enums';

export class FilterPaymentDto extends PaginationDto {
  @ApiPropertyOptional({ enum: PaymentTypeNew })
  @IsOptional()
  @IsEnum(PaymentTypeNew)
  paymentType?: PaymentTypeNew;

  @ApiPropertyOptional({ enum: PaymentStatusNew })
  @IsOptional()
  @IsEnum(PaymentStatusNew)
  status?: PaymentStatusNew;

  @ApiPropertyOptional({ description: 'Filter by partner ID' })
  @IsOptional()
  @IsUUID()
  partnerId?: string;

  @ApiPropertyOptional({ description: 'Filter by branch ID' })
  @IsOptional()
  @IsUUID()
  branchId?: string;

  @ApiPropertyOptional({ description: 'Payment date from', example: '2026-01-01' })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({ description: 'Payment date to', example: '2026-12-31' })
  @IsOptional()
  @IsDateString()
  dateTo?: string;
}
