import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsNumber, IsBoolean, MaxLength } from 'class-validator';
import {
  SalaryRuleCategory,
  SalaryRuleConditionType,
  SalaryRuleComputationType,
} from '@/common/enums/hr-new.enums';

export class UpdateSalaryRuleDto {
  @ApiPropertyOptional({ description: 'Execution order' })
  @IsOptional()
  @IsNumber()
  sequence?: number;

  @ApiPropertyOptional({ description: 'Rule code' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  code?: string;

  @ApiPropertyOptional({ description: 'Rule name in English' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  nameEn?: string;

  @ApiPropertyOptional({ description: 'Rule name in Arabic' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  nameAr?: string;

  @ApiPropertyOptional({ description: 'Rule category', enum: SalaryRuleCategory })
  @IsOptional()
  @IsEnum(SalaryRuleCategory)
  category?: SalaryRuleCategory;

  @ApiPropertyOptional({ description: 'Condition type', enum: SalaryRuleConditionType })
  @IsOptional()
  @IsEnum(SalaryRuleConditionType)
  conditionType?: SalaryRuleConditionType;

  @ApiPropertyOptional({ description: 'Python condition expression' })
  @IsOptional()
  @IsString()
  conditionPython?: string | null;

  @ApiPropertyOptional({ description: 'Computation type', enum: SalaryRuleComputationType })
  @IsOptional()
  @IsEnum(SalaryRuleComputationType)
  computationType?: SalaryRuleComputationType;

  @ApiPropertyOptional({ description: 'Fixed amount' })
  @IsOptional()
  @IsNumber()
  amount?: number | null;

  @ApiPropertyOptional({ description: 'Percentage base code' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  percentBase?: string | null;

  @ApiPropertyOptional({ description: 'Percentage value' })
  @IsOptional()
  @IsNumber()
  percentValue?: number | null;

  @ApiPropertyOptional({ description: 'Python computation code' })
  @IsOptional()
  @IsString()
  codePython?: string | null;

  @ApiPropertyOptional({ description: 'Show on payslip' })
  @IsOptional()
  @IsBoolean()
  appearsOnPayslip?: boolean;

  @ApiProperty({ description: 'Optimistic lock version' })
  @IsNumber()
  version!: number;
}
