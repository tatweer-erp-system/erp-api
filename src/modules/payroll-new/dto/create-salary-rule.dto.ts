import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsNumber, IsBoolean, MaxLength } from 'class-validator';
import {
  SalaryRuleCategory,
  SalaryRuleConditionType,
  SalaryRuleComputationType,
} from '@/common/enums/hr-new.enums';

export class CreateSalaryRuleDto {
  @ApiPropertyOptional({ description: 'Execution order', default: 0 })
  @IsOptional()
  @IsNumber()
  sequence?: number;

  @ApiProperty({ description: 'Rule code', example: 'BASIC' })
  @IsString()
  @MaxLength(20)
  code!: string;

  @ApiProperty({ description: 'Rule name in English', example: 'Basic Salary' })
  @IsString()
  @MaxLength(255)
  nameEn!: string;

  @ApiProperty({ description: 'Rule name in Arabic', example: 'الراتب الأساسي' })
  @IsString()
  @MaxLength(255)
  nameAr!: string;

  @ApiProperty({ description: 'Rule category', enum: SalaryRuleCategory })
  @IsEnum(SalaryRuleCategory)
  category!: SalaryRuleCategory;

  @ApiPropertyOptional({
    description: 'Condition type',
    enum: SalaryRuleConditionType,
    default: SalaryRuleConditionType.ALWAYS,
  })
  @IsOptional()
  @IsEnum(SalaryRuleConditionType)
  conditionType?: SalaryRuleConditionType;

  @ApiPropertyOptional({ description: 'Python condition expression' })
  @IsOptional()
  @IsString()
  conditionPython?: string;

  @ApiPropertyOptional({
    description: 'Computation type',
    enum: SalaryRuleComputationType,
    default: SalaryRuleComputationType.FIXED,
  })
  @IsOptional()
  @IsEnum(SalaryRuleComputationType)
  computationType?: SalaryRuleComputationType;

  @ApiPropertyOptional({ description: 'Fixed amount' })
  @IsOptional()
  @IsNumber()
  amount?: number;

  @ApiPropertyOptional({ description: 'Percentage base code (e.g. BASIC)' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  percentBase?: string;

  @ApiPropertyOptional({ description: 'Percentage value (e.g. 25.0000 for 25%)' })
  @IsOptional()
  @IsNumber()
  percentValue?: number;

  @ApiPropertyOptional({ description: 'Python computation code' })
  @IsOptional()
  @IsString()
  codePython?: string;

  @ApiPropertyOptional({ description: 'Show on payslip', default: true })
  @IsOptional()
  @IsBoolean()
  appearsOnPayslip?: boolean;
}
