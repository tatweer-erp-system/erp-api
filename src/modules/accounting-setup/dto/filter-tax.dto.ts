import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsBoolean, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { TaxScope } from '@/common/enums/accounting-new.enums';
import { PaginationDto } from '@/common/dto/pagination.dto';

export class FilterTaxDto extends PaginationDto {
  @ApiPropertyOptional({ enum: TaxScope })
  @IsOptional()
  @IsEnum(TaxScope)
  scope?: TaxScope;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;
}
