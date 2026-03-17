import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { BankStatementStatus } from '@/common/enums/bank-statement.enums';

export class FilterBankStatementDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'Filter by branch ID' })
  @IsOptional()
  @IsUUID()
  branchId?: string;

  @ApiPropertyOptional({ description: 'Filter by status', enum: BankStatementStatus })
  @IsOptional()
  @IsEnum(BankStatementStatus)
  status?: BankStatementStatus;
}
