import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';
import { PaginationDto } from '@/common/dto/pagination.dto';

export class SupplierProductFilterDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'Filter by product ID', format: 'uuid' })
  @IsOptional()
  @IsUUID()
  productId?: string;

  @ApiPropertyOptional({ description: 'Filter by partner (supplier) ID', format: 'uuid' })
  @IsOptional()
  @IsUUID()
  partnerId?: string;
}
