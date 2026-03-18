import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID, IsEnum } from 'class-validator';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { SalesOrderStatus } from '@/common/enums/crm.enums';

export class FilterSalesOrderDto extends PaginationDto {
  @ApiPropertyOptional({ enum: SalesOrderStatus, description: 'Filter by order status' })
  @IsOptional()
  @IsEnum(SalesOrderStatus)
  status?: SalesOrderStatus;

  @ApiPropertyOptional({ description: 'Filter by partner (customer) ID' })
  @IsOptional()
  @IsUUID()
  partnerId?: string;

  @ApiPropertyOptional({ description: 'Filter by branch ID' })
  @IsOptional()
  @IsUUID()
  branchId?: string;
}
