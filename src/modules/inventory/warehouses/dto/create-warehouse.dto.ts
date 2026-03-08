import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsObject, IsOptional, IsString } from 'class-validator';
import { LocalizedString } from '../../../../common/types/i18n.types';

export class CreateWarehouseDto {
  @ApiProperty({ example: { en: 'Main Warehouse', ar: 'المستودع الرئيسي' } })
  @IsObject()
  name!: LocalizedString;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  location?: string;
}
