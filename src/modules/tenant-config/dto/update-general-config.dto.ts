import { IsOptional, IsString, IsIn } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateGeneralConfigDto {
  @ApiPropertyOptional({ description: 'Timezone identifier (e.g. Asia/Riyadh)' })
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiPropertyOptional({ description: 'Default language', enum: ['en', 'ar'] })
  @IsOptional()
  @IsIn(['en', 'ar'])
  language?: string;

  @ApiPropertyOptional({ description: 'Date format pattern (e.g. DD/MM/YYYY)' })
  @IsOptional()
  @IsString()
  dateFormat?: string;
}
