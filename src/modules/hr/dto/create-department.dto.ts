import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateDepartmentDto {
  @ApiProperty({ description: 'Department name in English', example: 'Engineering' })
  @IsNotEmpty()
  @IsString()
  name_en!: string;

  @ApiProperty({ description: 'Department name in Arabic', example: 'الهندسة' })
  @IsNotEmpty()
  @IsString()
  name_ar!: string;

  @ApiPropertyOptional({
    description: 'Description in English',
    example: 'Software engineering team',
  })
  @IsOptional()
  @IsString()
  description_en?: string;

  @ApiPropertyOptional({ description: 'Description in Arabic', example: 'فريق هندسة البرمجيات' })
  @IsOptional()
  @IsString()
  description_ar?: string;

  @ApiPropertyOptional({ description: 'Manager ID (UUID)', format: 'uuid' })
  @IsOptional()
  @IsUUID()
  managerId?: string;

  @ApiPropertyOptional({ description: 'Parent department ID (UUID)', format: 'uuid' })
  @IsOptional()
  @IsUUID()
  parentId?: string;
}
