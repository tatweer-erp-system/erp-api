import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { DropdownQueryDto } from '@/common/dto/dropdown-query.dto';
import { PartnerType } from '@/common/enums/partner.enums';

export class PartnerDropdownQueryDto extends DropdownQueryDto {
  @ApiPropertyOptional({ enum: PartnerType })
  @IsOptional()
  @IsEnum(PartnerType)
  type?: PartnerType;
}
