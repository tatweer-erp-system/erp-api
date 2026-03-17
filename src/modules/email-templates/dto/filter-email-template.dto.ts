import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationDto } from '@/common/dto/pagination.dto';

export class FilterEmailTemplateDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'Filter by model type (e.g. invoice, sale_order)' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  model?: string;
}
