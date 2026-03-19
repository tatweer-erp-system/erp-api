import { IsOptional, IsString, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Language } from '@/common/enums/language.enum';

export class UpdateGeneralConfigDto {
  @ApiPropertyOptional({ description: 'Timezone identifier (e.g. Asia/Riyadh)' })
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiPropertyOptional({ description: 'Default language', enum: Language })
  @IsOptional()
  @IsEnum(Language)
  language?: Language;

  @ApiPropertyOptional({ description: 'Date format pattern (e.g. DD/MM/YYYY)' })
  @IsOptional()
  @IsString()
  dateFormat?: string;
}
