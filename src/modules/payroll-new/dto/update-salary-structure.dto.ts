import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsUUID, IsEnum, IsNumber, MaxLength } from 'class-validator';
import { SalaryStructureType } from '@/common/enums/hr-new.enums';

export class UpdateSalaryStructureDto {
  @ApiPropertyOptional({ description: 'Name in English' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  nameEn?: string;

  @ApiPropertyOptional({ description: 'Name in Arabic' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  nameAr?: string;

  @ApiPropertyOptional({ description: 'Structure type', enum: SalaryStructureType })
  @IsOptional()
  @IsEnum(SalaryStructureType)
  type?: SalaryStructureType;

  @ApiPropertyOptional({ description: 'Parent structure ID', format: 'uuid' })
  @IsOptional()
  @IsUUID()
  parentId?: string | null;

  @ApiProperty({ description: 'Optimistic lock version' })
  @IsNumber()
  version!: number;
}
