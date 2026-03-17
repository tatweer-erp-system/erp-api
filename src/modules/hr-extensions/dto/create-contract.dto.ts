import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ContractStatus, ContractType } from '@/common/enums/hr.enums';
import { WageType } from '@/common/enums/hr-new.enums';

export class CreateContractDto {
  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  employeeId!: string;

  @ApiProperty({ enum: ContractType, default: ContractType.FULL_TIME })
  @IsEnum(ContractType)
  contractType!: ContractType;

  @ApiProperty({ example: '2026-04-01' })
  @IsDateString()
  @IsNotEmpty()
  startDate!: string;

  @ApiPropertyOptional({ example: '2027-03-31' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiProperty({ example: 10000 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  basicSalary!: number;

  @ApiPropertyOptional({ example: 2000 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  housingAllowance?: number;

  @ApiPropertyOptional({ example: 500 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  transportationAllowance?: number;

  @ApiPropertyOptional({
    description: 'Wage type (monthly, daily, hourly)',
    enum: WageType,
    default: WageType.MONTHLY,
  })
  @IsOptional()
  @IsEnum(WageType)
  wageType?: WageType;

  @ApiPropertyOptional({ description: 'Wage amount (based on wageType)', example: 10000 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  wage?: number;

  @ApiPropertyOptional({ description: 'Salary structure ID', format: 'uuid' })
  @IsOptional()
  @IsUUID()
  salaryStructureId?: string;

  @ApiPropertyOptional({ description: 'Working schedule / shift ID', format: 'uuid' })
  @IsOptional()
  @IsUUID()
  workingScheduleId?: string;

  @ApiPropertyOptional({ enum: ContractStatus, default: ContractStatus.DRAFT })
  @IsOptional()
  @IsEnum(ContractStatus)
  status?: ContractStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
