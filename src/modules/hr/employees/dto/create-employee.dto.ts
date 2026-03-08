import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsUUID, IsString, IsOptional, IsDateString, IsNumber, IsObject } from 'class-validator';
import { LocalizedString } from '../../../../common/types/i18n.types';

export class CreateEmployeeDto {
  @ApiProperty()
  @IsUUID()
  userId!: string;

  @ApiProperty({ example: { en: 'Software Engineer', ar: 'مهندس برمجيات' } })
  @IsObject()
  position!: LocalizedString;

  @ApiProperty({ example: '2024-01-15' })
  @IsDateString()
  hireDate!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  departmentId?: string;

  @ApiPropertyOptional({ example: 'full-time' })
  @IsOptional()
  @IsString()
  employmentType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  basicSalary?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  salaryCurrency?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  employeeNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  managerId?: string;
}
