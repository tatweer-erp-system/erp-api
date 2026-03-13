import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateDepartmentDto {
  @ApiProperty({ description: 'Department name in English', example: 'Engineering' })
  @IsNotEmpty()
  @IsString()
  nameEn!: string;

  @ApiProperty({ description: 'Department name in Arabic', example: 'الهندسة' })
  @IsNotEmpty()
  @IsString()
  nameAr!: string;

  @ApiPropertyOptional({
    description: 'Description in English',
    example: 'Software engineering team',
  })
  @IsOptional()
  @IsString()
  descriptionEn?: string;

  @ApiPropertyOptional({ description: 'Description in Arabic', example: 'فريق هندسة البرمجيات' })
  @IsOptional()
  @IsString()
  descriptionAr?: string;

  @ApiPropertyOptional({ description: 'Manager ID (UUID)', format: 'uuid' })
  @IsOptional()
  @IsUUID()
  managerId?: string;

  @ApiPropertyOptional({ description: 'Parent department ID (UUID)', format: 'uuid' })
  @IsOptional()
  @IsUUID()
  parentId?: string;
}
