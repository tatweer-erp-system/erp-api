import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsObject, IsOptional, IsUUID } from 'class-validator';
import { LocalizedString } from '../../../../common/types/i18n.types';

export class CreateDepartmentDto {
  @ApiProperty({ example: { en: 'Engineering', ar: 'الهندسة' } })
  @IsObject()
  name!: LocalizedString;

  @ApiPropertyOptional({ example: { en: 'Software engineering team', ar: 'فريق هندسة البرمجيات' } })
  @IsOptional()
  @IsObject()
  description?: LocalizedString;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  parentId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  managerId?: string;
}
