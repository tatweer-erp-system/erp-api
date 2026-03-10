import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsObject, IsOptional, IsString, IsDateString, IsNumber, IsUUID } from 'class-validator';
import { LocalizedString } from '../../../../common/types/i18n.types';

export class CreateProjectDto {
  @ApiProperty({ example: { en: 'Website Redesign', ar: 'إعادة تصميم الموقع' } })
  @IsObject()
  name!: LocalizedString;
  @ApiPropertyOptional() @IsOptional() @IsObject() description?: LocalizedString;
  @ApiPropertyOptional() @IsOptional() @IsString() status?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() startDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() endDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() budget?: number;
  @ApiPropertyOptional() @IsOptional() @IsUUID() managerId?: string;
}
