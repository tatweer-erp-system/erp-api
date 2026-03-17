import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsUUID, IsEnum, MaxLength } from 'class-validator';
import { SalaryStructureType } from '@/common/enums/hr-new.enums';

export class CreateSalaryStructureDto {
  @ApiProperty({ description: 'Name in English', example: 'Default Structure' })
  @IsString()
  @MaxLength(255)
  nameEn!: string;

  @ApiProperty({ description: 'Name in Arabic', example: 'الهيكل الافتراضي' })
  @IsString()
  @MaxLength(255)
  nameAr!: string;

  @ApiPropertyOptional({
    description: 'Structure type',
    enum: SalaryStructureType,
    default: SalaryStructureType.EMPLOYEE,
  })
  @IsOptional()
  @IsEnum(SalaryStructureType)
  type?: SalaryStructureType;

  @ApiPropertyOptional({ description: 'Parent structure ID', format: 'uuid' })
  @IsOptional()
  @IsUUID()
  parentId?: string;
}
