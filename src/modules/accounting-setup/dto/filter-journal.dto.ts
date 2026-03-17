import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsBoolean, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { JournalType } from '@/common/enums/accounting-new.enums';
import { PaginationDto } from '@/common/dto/pagination.dto';

export class FilterJournalDto extends PaginationDto {
  @ApiPropertyOptional({ enum: JournalType })
  @IsOptional()
  @IsEnum(JournalType)
  type?: JournalType;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;
}
