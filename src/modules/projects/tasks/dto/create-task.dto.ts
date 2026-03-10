import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsObject, IsOptional, IsString, IsDateString, IsNumber, IsUUID } from 'class-validator';
import { LocalizedString } from '../../../../common/types/i18n.types';

export class CreateTaskDto {
  @ApiProperty() @IsUUID() projectId!: string;
  @ApiProperty({ example: { en: 'Design mockups', ar: 'تصميم النماذج' } })
  @IsObject()
  title!: LocalizedString;
  @ApiPropertyOptional() @IsOptional() @IsObject() description?: LocalizedString;
  @ApiPropertyOptional() @IsOptional() @IsString() status?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() priority?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() assignedTo?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() dueDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() estimatedHours?: number;
  @ApiPropertyOptional() @IsOptional() @IsUUID() parentTaskId?: string;
}
